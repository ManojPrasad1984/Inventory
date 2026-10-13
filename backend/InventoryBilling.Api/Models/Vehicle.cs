using System.ComponentModel.DataAnnotations;

namespace InventoryBilling.Api.Models;

/// <summary>
/// Workflow step 2: "Vehicle -> Vehicle Number, Executive Detail, Driver & Helper".
/// Driver/Helper/Executive are master-data labels here, not separate login accounts.
/// </summary>
public class Vehicle
{
    public int Id { get; set; }

    [Required, MaxLength(30)]
    public string VehicleNumber { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ExecutiveName { get; set; }

    [MaxLength(100)]
    public string? DriverName { get; set; }

    [MaxLength(20)]
    public string? DriverPhone { get; set; }

    [MaxLength(100)]
    public string? HelperName { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Live "what's on this vehicle right now" balance, in base units. Fast lookup, kept in sync by Trip load/sale/return actions.</summary>
public class VehicleStock
{
    public int Id { get; set; }

    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    public int ProductId { get; set; }
    public Product? Product { get; set; }

    public int QuantityUnits { get; set; }
}
