namespace InventoryBilling.Api.DTOs;

public record ShopUpsertRequest(
    string Name,
    string? Phone,
    string? Address,
    string? GstNumber,
    decimal? CreditLimit
);

public record ShopPaymentRequest(decimal Amount, string? Notes);
