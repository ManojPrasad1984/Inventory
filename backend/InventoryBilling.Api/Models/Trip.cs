using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryBilling.Api.Models;

public enum TripStatus
{
    Open,   // vehicle is loaded and/or out making sales
    Closed  // reconciled - unsold stock returned to godown
}

/// <summary>
/// Workflow steps 3 & 4: "Godown Out (vehicle basis)" followed by "Vehicle Sales (retail sale to shops, all payment
/// types, credit tracked)". A Trip is one vehicle's day/round: it accumulates load-out quantities and the sales made
/// against them, then closes with a reconciliation of what actually came back unsold.
/// </summary>
public class Trip
{
    public int Id { get; set; }

    [Required, MaxLength(30)]
    public string TripNumber { get; set; } = string.Empty;

    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    public DateTime TripDate { get; set; } = DateTime.UtcNow;

    public TripStatus Status { get; set; } = TripStatus.Open;

    public List<TripLoadItem> LoadItems { get; set; } = new();

    public List<TripReturnItem> ReturnItems { get; set; } = new();

    public DateTime? ClosedAt { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Stock moved from godown onto the vehicle for this trip. A trip can be topped up with more than one load.</summary>
public class TripLoadItem
{
    public int Id { get; set; }

    public int TripId { get; set; }
    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }

    public int ProductId { get; set; }
    public Product? Product { get; set; }

    [MaxLength(200)]
    public string ProductName { get; set; } = string.Empty;

    public int QuantityUnits { get; set; }

    public DateTime LoadedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Unsold stock physically returned to the godown when a trip closes, used to reconcile against expected remainder.</summary>
public class TripReturnItem
{
    public int Id { get; set; }

    public int TripId { get; set; }
    [ForeignKey(nameof(TripId))]
    public Trip? Trip { get; set; }

    public int ProductId { get; set; }
    public Product? Product { get; set; }

    [MaxLength(200)]
    public string ProductName { get; set; } = string.Empty;

    public int ExpectedQuantityUnits { get; set; } // loaded - sold, computed at close time
    public int ReturnedQuantityUnits { get; set; } // what was physically counted back in

    // ExpectedQuantityUnits - ReturnedQuantityUnits: positive means stock is missing/broken/short
    [NotMapped]
    public int VarianceUnits => ExpectedQuantityUnits - ReturnedQuantityUnits;
}
