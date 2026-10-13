namespace InventoryBilling.Api.DTOs;

public record TripCreateRequest(int VehicleId, DateTime? TripDate, string? Notes);

public record TripLoadItemRequest(int ProductId, int QuantityUnits);

public record TripLoadRequest(List<TripLoadItemRequest> Items);

public record TripReturnItemRequest(int ProductId, int ReturnedQuantityUnits);

public record TripCloseRequest(List<TripReturnItemRequest> Returns);
