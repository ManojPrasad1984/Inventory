namespace InventoryBilling.Api.DTOs;

public record ProductUpsertRequest(
    string Name,
    string? Sku,
    string? BrandCategory,
    string? PackSize,
    int UnitsPerCase,
    decimal MrpPerUnit,
    decimal PurchasePricePerCase,
    decimal SellingPricePerCase,
    decimal TaxPercent,
    int GodownStockUnits,
    int LowStockThresholdUnits
);

// Manual correction only (breakage, stock count fix) - normal stock movement happens via Purchases/Trips.
public record StockAdjustRequest(int DeltaUnits, string? Reason);
