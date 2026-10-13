using System.ComponentModel.DataAnnotations;

namespace InventoryBilling.Api.Models;

public class Customer
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(200)]
    public string? Email { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(50)]
    public string? GstNumber { get; set; }

    // Running balance owed by the customer (for credit sales)
    public decimal OutstandingBalance { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
