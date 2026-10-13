using InventoryBilling.Api.Models;

namespace InventoryBilling.Api.DTOs;

public record VehicleSaleItemRequest(int ProductId, int QuantityUnits);

public record VehicleSaleCreateRequest(
    int TripId,
    int ShopId,
    List<VehicleSaleItemRequest> Items,
    decimal DiscountAmount,
    decimal AmountPaid,
    SalePaymentMethod PaymentMethod,
    string? Notes
);
