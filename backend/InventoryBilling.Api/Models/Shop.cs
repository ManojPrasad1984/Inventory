using System.ComponentModel.DataAnnotations;

namespace InventoryBilling.Api.Models;

/// <summary>
/// The retailer a vehicle sells to on its round. Workflow: "Vehicle Sales -> Sale to Shop only, Credit Balance Tracking".
/// There is no walk-in/individual customer concept in this business - every sale is to a registered Shop.
/// </summary>
public class Shop
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

    // Optional soft cap - sales can still be recorded over it, the API just flags it so staff can decide.
    public decimal? CreditLimit { get; set; }

    // Fast cached running balance (sum of ledger debits - credits). Source of truth is ShopLedgerEntry for history/audit.
    public decimal OutstandingBalance { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum LedgerEntryType
{
    Sale,    // debit - increases what the shop owes
    Payment  // credit - reduces what the shop owes
}

/// <summary>Append-only history of everything that moved a shop's balance, so "credit balance tracking" is a real ledger, not just a number.</summary>
public class ShopLedgerEntry
{
    public int Id { get; set; }

    public int ShopId { get; set; }
    public Shop? Shop { get; set; }

    public DateTime EntryDate { get; set; } = DateTime.UtcNow;

    public LedgerEntryType Type { get; set; }

    // Which record this entry came from (a VehicleSale.Id or a standalone payment) - for drill-down from the ledger view.
    public int? VehicleSaleId { get; set; }

    public decimal Debit { get; set; }  // sale amount
    public decimal Credit { get; set; } // payment amount

    public decimal RunningBalance { get; set; } // balance immediately after this entry, for a fast statement view

    [MaxLength(300)]
    public string? Notes { get; set; }
}
