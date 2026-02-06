import { Component, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MenuItem } from '../../models';
import { CartService } from '../../services/cart';

@Component({
  selector: 'get-order-stack-upsell-bar',
  imports: [CurrencyPipe],
  templateUrl: './upsell-bar.html',
  styleUrl: './upsell-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsellBar {
  private readonly cartService = inject(CartService);

  suggestions = input<MenuItem[]>([]);
  title = input<string>('Add to your order?');

  itemAdded = output<MenuItem>();

  readonly isEmpty = this.cartService.isEmpty;

  addItem(item: MenuItem): void {
    this.cartService.addItem(item);
    this.itemAdded.emit(item);
  }
}
