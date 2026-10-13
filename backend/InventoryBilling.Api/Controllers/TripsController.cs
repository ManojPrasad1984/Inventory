using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryBilling.Api.Data;
using InventoryBilling.Api.DTOs;
using InventoryBilling.Api.Models;

namespace InventoryBilling.Api.Controllers;

/// <summary>
/// A Trip is one vehicle's day/round: workflow steps 3 & 4 ("Godown Out - vehicle basis" then "Vehicle Sales").
/// Lifecycle: Create (Open) -> Load (repeatable, godown stock moves to the vehicle) -> Sales happen against it ->
/// Close (count what came back, reconcile against expected, unsold stock returns to the godown).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly AppDbContext _db;
    public TripsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Trip>>> GetAll([FromQuery] TripStatus? status, [FromQuery] int? vehicleId)
    {
        var query = _db.Trips.Include(t => t.Vehicle).AsQueryable();
        if (status.HasValue) query = query.Where(t => t.Status == status.Value);
        if (vehicleId.HasValue) query = query.Where(t => t.VehicleId == vehicleId.Value);

        return Ok(await query.OrderByDescending(t => t.TripDate).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetById(int id)
    {
        var trip = await _db.Trips
            .Include(t => t.Vehicle)
            .Include(t => t.LoadItems)
            .Include(t => t.ReturnItems)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip is null) return NotFound();

        var sales = await _db.VehicleSales
            .Include(s => s.Shop)
            .Include(s => s.Items)
            .Where(s => s.TripId == id)
            .OrderByDescending(s => s.SaleDate)
            .ToListAsync();

        var currentStock = await _db.VehicleStocks
            .Where(vs => vs.VehicleId == trip.VehicleId && vs.QuantityUnits > 0)
            .Include(vs => vs.Product)
            .Select(vs => new { vs.ProductId, ProductName = vs.Product!.Name, vs.QuantityUnits })
            .ToListAsync();

        return Ok(new { trip, sales, currentStock });
    }

    // Step 2: open a trip for a vehicle
    [HttpPost]
    public async Task<ActionResult<Trip>> Create(TripCreateRequest request)
    {
        var vehicle = await _db.Vehicles.FindAsync(request.VehicleId);
        if (vehicle is null) return BadRequest("Vehicle not found.");
        if (!vehicle.IsActive) return BadRequest("This vehicle is retired.");

        var hasOpenTrip = await _db.Trips.AnyAsync(t => t.VehicleId == request.VehicleId && t.Status == TripStatus.Open);
        if (hasOpenTrip) return Conflict("This vehicle already has an open trip. Close it before starting a new one.");

        var trip = new Trip
        {
            TripNumber = await GenerateTripNumberAsync(),
            VehicleId = request.VehicleId,
            TripDate = request.TripDate ?? DateTime.UtcNow,
            Notes = request.Notes
        };
        _db.Trips.Add(trip);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = trip.Id }, trip);
    }

    // Step 3: "Godown Out" - move stock from the godown onto this trip's vehicle. Can be called more than once per trip.
    [HttpPost("{id}/load")]
    public async Task<IActionResult> Load(int id, TripLoadRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest("Provide at least one product to load.");

        var trip = await _db.Trips.FindAsync(id);
        if (trip is null) return NotFound();
        if (trip.Status != TripStatus.Open) return BadRequest("This trip is already closed.");

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            foreach (var line in request.Items)
            {
                if (line.QuantityUnits <= 0) continue;

                var product = await _db.Products.FindAsync(line.ProductId);
                if (product is null) return BadRequest($"Product {line.ProductId} not found.");
                if (product.GodownStockUnits < line.QuantityUnits)
                    return BadRequest($"Insufficient godown stock for '{product.Name}'. Available: {product.GodownStockUnits}, requested: {line.QuantityUnits}.");

                product.GodownStockUnits -= line.QuantityUnits;
                product.UpdatedAt = DateTime.UtcNow;

                _db.TripLoadItems.Add(new TripLoadItem
                {
                    TripId = trip.Id,
                    ProductId = product.Id,
                    ProductName = product.Name,
                    QuantityUnits = line.QuantityUnits
                });

                var vehicleStock = await _db.VehicleStocks
                    .FirstOrDefaultAsync(vs => vs.VehicleId == trip.VehicleId && vs.ProductId == product.Id);
                if (vehicleStock is null)
                {
                    vehicleStock = new VehicleStock { VehicleId = trip.VehicleId, ProductId = product.Id, QuantityUnits = 0 };
                    _db.VehicleStocks.Add(vehicleStock);
                }
                vehicleStock.QuantityUnits += line.QuantityUnits;
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // Close the trip: count what physically came back, compare against (loaded - sold), and return the counted
    // quantity to the godown. Any shortfall is recorded as variance (breakage/loss) rather than silently vanishing.
    [HttpPost("{id}/close")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Close(int id, TripCloseRequest request)
    {
        var trip = await _db.Trips.Include(t => t.LoadItems).FirstOrDefaultAsync(t => t.Id == id);
        if (trip is null) return NotFound();
        if (trip.Status != TripStatus.Open) return BadRequest("This trip is already closed.");

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var vehicleStocks = await _db.VehicleStocks
                .Where(vs => vs.VehicleId == trip.VehicleId)
                .ToListAsync();

            var returnsByProduct = request.Returns.ToDictionary(r => r.ProductId, r => r.ReturnedQuantityUnits);

            foreach (var stock in vehicleStocks.Where(s => s.QuantityUnits > 0))
            {
                var expected = stock.QuantityUnits; // whatever's left on the vehicle after sales = expected return
                var returned = returnsByProduct.GetValueOrDefault(stock.ProductId, expected);

                var product = await _db.Products.FindAsync(stock.ProductId);
                var productName = product?.Name ?? $"Product #{stock.ProductId}";

                _db.TripReturnItems.Add(new TripReturnItem
                {
                    TripId = trip.Id,
                    ProductId = stock.ProductId,
                    ProductName = productName,
                    ExpectedQuantityUnits = expected,
                    ReturnedQuantityUnits = returned
                });

                // Only the physically counted quantity goes back into the godown
                if (product is not null)
                {
                    product.GodownStockUnits += returned;
                    product.UpdatedAt = DateTime.UtcNow;
                }

                stock.QuantityUnits = 0; // vehicle is empty once the trip is closed
            }

            trip.Status = TripStatus.Closed;
            trip.ClosedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(trip);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task<string> GenerateTripNumberAsync()
    {
        var today = DateTime.UtcNow;
        var prefix = $"TRIP-{today:yyyyMMdd}-";
        var countToday = await _db.Trips.CountAsync(t => t.TripNumber.StartsWith(prefix));
        return $"{prefix}{(countToday + 1):D3}";
    }
}
