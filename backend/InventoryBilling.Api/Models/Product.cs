using System.ComponentModel.DataAnnotations;

namespace InventoryBilling.Api.Models;

public class Product
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Sku { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Category { get; set; }

    [MaxLength(20)]
    public string Unit { get; set; } = "pcs"; // pcs, kg, ltr, box, etc.

    public decimal PurchasePrice { get; set; }

    public decimal SellingPrice { get; set; }

    public decimal TaxPercent { get; set; } = 0; // e.g. GST %

    public int StockQuantity { get; set; }

    public int LowStockThreshold { get; set; } = 5;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
