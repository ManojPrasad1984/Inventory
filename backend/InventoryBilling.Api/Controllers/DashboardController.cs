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

        var todaySales = await _db.Invoices
            .Where(i => i.InvoiceDate >= todayStart)
            .SumAsync(i => (decimal?)i.TotalAmount) ?? 0;

        var monthSales = await _db.Invoices
            .Where(i => i.InvoiceDate >= monthStart)
            .SumAsync(i => (decimal?)i.TotalAmount) ?? 0;

        var todayInvoiceCount = await _db.Invoices.CountAsync(i => i.InvoiceDate >= todayStart);

        var totalOutstanding = await _db.Customers.SumAsync(c => (decimal?)c.OutstandingBalance) ?? 0;

        var lowStockCount = await _db.Products
            .CountAsync(p => p.IsActive && p.StockQuantity <= p.LowStockThreshold);

        var totalProducts = await _db.Products.CountAsync(p => p.IsActive);
        var totalCustomers = await _db.Customers.CountAsync();

        var topProducts = await _db.InvoiceItems
            .GroupBy(ii => ii.ProductName)
            .Select(g => new { productName = g.Key, totalQty = g.Sum(x => x.Quantity), revenue = g.Sum(x => x.LineTotal) })
            .OrderByDescending(x => x.revenue)
            .Take(5)
            .ToListAsync();

        return Ok(new
        {
            todaySales,
            monthSales,
            todayInvoiceCount,
            totalOutstanding,
            lowStockCount,
            totalProducts,
            totalCustomers,
            topProducts
        });
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStock()
    {
        var items = await _db.Products
            .Where(p => p.IsActive && p.StockQuantity <= p.LowStockThreshold)
            .OrderBy(p => p.StockQuantity)
            .ToListAsync();
        return Ok(items);
    }
}
