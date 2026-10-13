using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryBilling.Api.Models;

/// <summary>
/// A beverage/FMCG SKU sold by case (carton) and tracked internally in base units (bottles/cans).
/// Matches the distributor's price sheet: Brand Category -> Pack -> MRP -> Units/Case -> Case price -> Retailer purchase price.
/// </summary>
public class Product
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty; // e.g. "250 ml CSD Cock Zero"

    [MaxLength(50)]
    public string? Sku { get; set; }

    // Groups products the way the price sheet does: RGB, SODA, CSD PET, PET JUICE, CAN, KINLEY WATER, etc.
    [MaxLength(100)]
    public string? BrandCategory { get; set; }

    [MaxLength(50)]
    public string? PackSize { get; set; } // e.g. "250 ml", "1 Ltr"

    // Stock is always stored internally as base units (individual bottles/cans), never cases,
    // so sales/returns/loads of partial cases never cause rounding drift.
    public int UnitsPerCase { get; set; } = 1;

    public decimal MrpPerUnit { get; set; } // printed MRP per bottle - informational, what the shop charges its own customer

    public decimal PurchasePricePerCase { get; set; } // what we pay the supplier per case
    public decimal SellingPricePerCase { get; set; } // what we charge the shop per case (the "Retailer's Purchase Price" column)

    public decimal TaxPercent { get; set; } = 0;

    // Current stock sitting in the godown (warehouse), in base units. Vehicle-held stock is tracked separately in VehicleStock.
    public int GodownStockUnits { get; set; }

    public int LowStockThresholdUnits { get; set; } = 24;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Convenience, computed only - excluded from EF Core's model and included in JSON as a plain read value
    [NotMapped]
    public decimal PurchasePricePerUnit => UnitsPerCase > 0 ? Math.Round(PurchasePricePerCase / UnitsPerCase, 4) : 0;

    [NotMapped]
    public decimal SellingPricePerUnit => UnitsPerCase > 0 ? Math.Round(SellingPricePerCase / UnitsPerCase, 4) : 0;
}
