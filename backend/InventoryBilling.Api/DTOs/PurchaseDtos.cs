using InventoryBilling.Api.Models;

namespace InventoryBilling.Api.DTOs;

public record PurchaseItemRequest(int ProductId, int QuantityCases, decimal UnitCostPerCase);

public record PurchaseCreateRequest(
    int SupplierId,
    string? SupplierInvoiceNumber,
    DateTime? InvoiceDate,
    List<PurchaseItemRequest> Items,
    decimal AmountPaid,
    PurchasePaymentMode PaymentMode,
    string? Notes
);
