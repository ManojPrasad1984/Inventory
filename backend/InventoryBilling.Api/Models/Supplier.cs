using System.ComponentModel.DataAnnotations;

namespace InventoryBilling.Api.Models;

/// <summary>A goods supplier, e.g. "Superior" in the workflow notes.</summary>
public class Supplier
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(50)]
    public string? GstNumber { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
