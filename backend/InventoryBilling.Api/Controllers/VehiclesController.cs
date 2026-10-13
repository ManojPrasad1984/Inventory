using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryBilling.Api.Data;
using InventoryBilling.Api.DTOs;
using InventoryBilling.Api.Models;

namespace InventoryBilling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VehiclesController : ControllerBase
{
    private readonly AppDbContext _db;
    public VehiclesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Vehicle>>> GetAll([FromQuery] bool activeOnly = true)
    {
        var query = _db.Vehicles.AsQueryable();
        if (activeOnly) query = query.Where(v => v.IsActive);
        return Ok(await query.OrderBy(v => v.VehicleNumber).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Vehicle>> GetById(int id)
    {
        var vehicle = await _db.Vehicles.FindAsync(id);
        if (vehicle is null) return NotFound();
        return Ok(vehicle);
    }

    // What's currently loaded on this vehicle (live balance, kept in sync by Trip load/sale/return actions)
    [HttpGet("{id}/stock")]
    public async Task<ActionResult<IEnumerable<object>>> GetCurrentStock(int id)
    {
        var stock = await _db.VehicleStocks
            .Where(vs => vs.VehicleId == id && vs.QuantityUnits > 0)
            .Include(vs => vs.Product)
            .OrderBy(vs => vs.Product!.Name)
            .Select(vs => new
            {
                vs.ProductId,
                ProductName = vs.Product!.Name,
                vs.Product.UnitsPerCase,
                vs.QuantityUnits
            })
            .ToListAsync();
        return Ok(stock);
    }

    [HttpPost]
    public async Task<ActionResult<Vehicle>> Create(VehicleUpsertRequest request)
    {
        var exists = await _db.Vehicles.AnyAsync(v => v.VehicleNumber == request.VehicleNumber);
        if (exists) return Conflict("A vehicle with this number already exists.");

        var vehicle = new Vehicle
        {
            VehicleNumber = request.VehicleNumber,
            ExecutiveName = request.ExecutiveName,
            DriverName = request.DriverName,
            DriverPhone = request.DriverPhone,
            HelperName = request.HelperName
        };
        _db.Vehicles.Add(vehicle);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = vehicle.Id }, vehicle);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, VehicleUpsertRequest request)
    {
        var vehicle = await _db.Vehicles.FindAsync(id);
        if (vehicle is null) return NotFound();

        vehicle.VehicleNumber = request.VehicleNumber;
        vehicle.ExecutiveName = request.ExecutiveName;
        vehicle.DriverName = request.DriverName;
        vehicle.DriverPhone = request.DriverPhone;
        vehicle.HelperName = request.HelperName;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(int id)
    {
        var vehicle = await _db.Vehicles.FindAsync(id);
        if (vehicle is null) return NotFound();

        var hasTrips = await _db.Trips.AnyAsync(t => t.VehicleId == id);
        if (hasTrips)
        {
            // Keep history intact - just retire the vehicle instead of deleting it
            vehicle.IsActive = false;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        _db.Vehicles.Remove(vehicle);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
