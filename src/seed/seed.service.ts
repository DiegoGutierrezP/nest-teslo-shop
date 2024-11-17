import { Injectable } from '@nestjs/common';
import { ProductsService } from 'src/products/products.service';
import { initialData } from './data/seed-data';

@Injectable()
export class SeedService {

  constructor(
    private readonly productService: ProductsService
  ) { }

  async runSeed() {
    await this.insertNewProducts();
    return `This seed was executed`;
  }

  private async insertNewProducts() {
    await this.productService.deleteAllProducts();

    const products = initialData.products;

    const insertPromises = [];

    products.forEach(p => {
      insertPromises.push(this.productService.create(p))
    })

    await Promise.all(insertPromises);

    return true
  }
}
