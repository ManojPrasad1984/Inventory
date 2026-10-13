using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryBilling.Api.Models;

public enum PurchasePaymentMode
{
    Online,
    AdvanceFull,
    Cash,
    Credit
}

/// <summary>
/// A Goods-Received-Note: stock coming into the godown from a supplier invoice.
/// Workflow step 1: "Superior से आया -> Invoice -> Payment Online / Advance payment (Full) -> Inventory Addition".
/// </summary>
public class Purchase
{
    public int Id { get; set; }

    [Required, MaxLength(30)]
    public string PurchaseNumber { get; set; } = string.Empty; // our internal GRN number

    public int SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    [MaxLength(50)]
    public string? SupplierInvoiceNumber { get; set; }

    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;

    public List<PurchaseItem> Items { get; set; } = new();

    public decimal TotalAmount { get; set; }

    public decimal AmountPaid { get; set; }

    public PurchasePaymentMode PaymentMode { get; set; } = PurchasePaymentMode.AdvanceFull;

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PurchaseItem
{
    public int Id { get; set; }

    public int PurchaseId { get; set; }
    [ForeignKey(nameof(PurchaseId))]
    public Purchase? Purchase { get; set; }

    public int ProductId { get; set; }
    public Product? Product { get; set; }

    [MaxLength(200)]
    public string ProductName { get; set; } = string.Empty; // snapshot

    public int QuantityCases { get; set; } // how the supplier invoice is usually billed
    public int QuantityUnits { get; set; } // QuantityCases * Product.UnitsPerCase at the time of entry, kept explicit for audit

    public decimal UnitCostPerCase { get; set; }

    public decimal LineTotal { get; set; }
}
