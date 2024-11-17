import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUUID } from 'uuid'

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) { }

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create({ ...createProductDto });//crea registro en memoria
      await this.productRepository.save(product);

      return product
    } catch (err) {
      this.handleDBException(err);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    return await this.productRepository.find({
      take: paginationDto.limit || 5,
      skip: paginationDto.offset || 0
      //TODO: relations
    });
  }

  async findOne(term: string) {

    let product: Product;

    if (isUUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term })
    } else {
      //Query Builder
      const queryBuilder = this.productRepository.createQueryBuilder();

      product = await queryBuilder.where(`title ILIKE :title or slug ILIKE :slug`, {
        title: `%${term}%`,
        slug: `%${term}%`,
      }).getOne();
    }

    if (!product)
      throw new NotFoundException('Product not found');

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({//busca el product por id y carga todas las propiedades presentes del dto
      id: id,
      ...updateProductDto
    })

    if (!product)
      throw new NotFoundException('Product not foud');

    try {
      await this.productRepository.save(product);
    } catch (err) {
      this.handleDBException(err)
    }

    return product
  }

  async remove(id: string) {

    const product = await this.findOne(id);
    await this.productRepository.remove(product);

  }

  private handleDBException(error: any) {
    if (error.code === '23505')
      throw new BadRequestException(error.detail);

    this.logger.error(error)
    throw new InternalServerErrorException('Unexpected error,check server logs')
  }
}
