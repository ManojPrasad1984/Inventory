using InventoryBilling.Api.Models;

namespace InventoryBilling.Api.DTOs;

public record InvoiceItemRequest(int ProductId, int Quantity);

public record InvoiceCreateRequest(
    int? CustomerId,
    string? WalkInCustomerName,
    List<InvoiceItemRequest> Items,
    decimal DiscountAmount,
    decimal AmountPaid,
    PaymentMethod PaymentMethod,
    string? Notes
);
