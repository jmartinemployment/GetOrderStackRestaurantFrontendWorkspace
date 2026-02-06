import { Component, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { Order } from '../../models';

@Component({
  selector: 'get-order-stack-receipt-printer',
  imports: [CurrencyPipe, TitleCasePipe],
  templateUrl: './receipt-printer.html',
  styleUrl: './receipt-printer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiptPrinter {
  order = input.required<Order>();
  restaurantName = input<string>('GetOrderStack Restaurant');
  restaurantAddress = input<string>('');
  restaurantPhone = input<string>('');
  showPrintButton = input<boolean>(true);

  private readonly _isPrinting = signal(false);
  readonly isPrinting = this._isPrinting.asReadonly();

  getOrderNumber(): string {
    const order = this.order();
    return order.orderNumber || order.id.slice(-4).toUpperCase();
  }

  print(): void {
    this._isPrinting.set(true);

    // Use the browser's print functionality
    setTimeout(() => {
      window.print();
      this._isPrinting.set(false);
    }, 100);
  }

  getFormattedDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
