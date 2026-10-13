using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryBilling.Api.Data;
using InventoryBilling.Api.Models;

namespace InventoryBilling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    public DashboardController(AppDbContext db) => _db = db;

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var todayStart = DateTime.UtcNow.Date;
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        var todaySales = await _db.VehicleSales
            .Where(s => s.SaleDate >= todayStart)
            .SumAsync(s => (decimal?)s.TotalAmount) ?? 0;

        var monthSales = await _db.VehicleSales
            .Where(s => s.SaleDate >= monthStart)
            .SumAsync(s => (decimal?)s.TotalAmount) ?? 0;

        var todaySaleCount = await _db.VehicleSales.CountAsync(s => s.SaleDate >= todayStart);

        var totalOutstanding = await _db.Shops.SumAsync(s => (decimal?)s.OutstandingBalance) ?? 0;

        var lowStockCount = await _db.Products
            .CountAsync(p => p.IsActive && p.GodownStockUnits <= p.LowStockThresholdUnits);

        var totalProducts = await _db.Products.CountAsync(p => p.IsActive);
        var totalShops = await _db.Shops.CountAsync(s => s.IsActive);

        var openTrips = await _db.Trips
            .Include(t => t.Vehicle)
            .Where(t => t.Status == TripStatus.Open)
            .Select(t => new { t.Id, t.TripNumber, VehicleNumber = t.Vehicle!.VehicleNumber, t.TripDate })
            .ToListAsync();

        var todayPurchases = await _db.Purchases
            .Where(p => p.InvoiceDate >= todayStart)
            .SumAsync(p => (decimal?)p.TotalAmount) ?? 0;

        var topProducts = await _db.VehicleSaleItems
            .Where(i => i.VehicleSale!.SaleDate >= monthStart)
            .GroupBy(ii => ii.ProductName)
            .Select(g => new { productName = g.Key, totalQtyUnits = g.Sum(x => x.QuantityUnits), revenue = g.Sum(x => x.LineTotal) })
            .OrderByDescending(x => x.revenue)
            .Take(5)
            .ToListAsync();

        return Ok(new
        {
            todaySales,
            monthSales,
            todaySaleCount,
            totalOutstanding,
            lowStockCount,
            totalProducts,
            totalShops,
            openTripsCount = openTrips.Count,
            openTrips,
            todayPurchases,
            topProducts
        });
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStock()
    {
        var items = await _db.Products
            .Where(p => p.IsActive && p.GodownStockUnits <= p.LowStockThresholdUnits)
            .OrderBy(p => p.GodownStockUnits)
            .ToListAsync();
        return Ok(items);
    }
}
