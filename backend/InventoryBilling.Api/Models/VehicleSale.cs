using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryBilling.Api.Models;

public enum SalePaymentStatus
{
    Paid,
    Partial,
    Unpaid
}

public enum SalePaymentMethod
{
    Cash,
    Online,
    UPI,
    Cheque,
    Credit
}

/// <summary>
/// Workflow step 4: "Vehicle Sales -> Retail Sale, All type of Payment, Credit Balance Tracking, Sale to Shop only".
/// Always made within an open Trip; deducts from that trip's vehicle (not the godown - stock already moved there at load-out).
/// </summary>
public class VehicleSale
{
    public int Id { get; set; }

    [Required, MaxLength(30)]
    public string InvoiceNumber { get; set; } = string.Empty;

    public int TripId { get; set; }
    public Trip? Trip { get; set; }

    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    public int ShopId { get; set; }
    public Shop? Shop { get; set; }

    public DateTime SaleDate { get; set; } = DateTime.UtcNow;

    public List<VehicleSaleItem> Items { get; set; } = new();

    public decimal SubTotal { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal AmountPaid { get; set; }

    public SalePaymentStatus PaymentStatus { get; set; } = SalePaymentStatus.Paid;

    public SalePaymentMethod PaymentMethod { get; set; } = SalePaymentMethod.Cash;

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class VehicleSaleItem
{
    public int Id { get; set; }

    public int VehicleSaleId { get; set; }
    [ForeignKey(nameof(VehicleSaleId))]
    public VehicleSale? VehicleSale { get; set; }

    public int ProductId { get; set; }
    public Product? Product { get; set; }

    [MaxLength(200)]
    public string ProductName { get; set; } = string.Empty; // snapshot

    public int QuantityUnits { get; set; }

    public decimal UnitPrice { get; set; } // snapshot of SellingPricePerUnit at time of sale

    public decimal TaxPercent { get; set; }

    public decimal LineTotal { get; set; }
}
