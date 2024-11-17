import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUUID } from 'uuid'
import { ProductImage } from './entities';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    private readonly dataSource: DataSource
  ) { }

  async create(createProductDto: CreateProductDto, user: User) {
    try {

      const { images = [], ...productDetails } = createProductDto;

      //crea registro en memoria
      const product = this.productRepository.create({
        ...productDetails,
        images: images.map(img => this.productImageRepository.create({ url: img })),
        user
      });

      await this.productRepository.save(product);

      return product
    } catch (err) {
      this.handleDBException(err);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const products = await this.productRepository.find({
      take: paginationDto.limit || 5,
      skip: paginationDto.offset || 0,
      // relations: ['images'],
      relations: {
        images: true
      },
    });

    return products.map(p => ({
      ...p,
      images: p.images.map(img => img.url)
    }))
  }

  async findOne(term: string) {

    let product: Product;

    if (isUUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term })
    } else {
      //Query Builder
      const queryBuilder = this.productRepository.createQueryBuilder('prod');

      product = await queryBuilder.where(`title ILIKE :title or slug ILIKE :slug`, {
        title: `%${term}%`,
        slug: `%${term}%`,
      })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne();
    }

    if (!product)
      throw new NotFoundException('Product not found');

    return product
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {

    const { images, ...toUpdate } = updateProductDto;

    //busca el product por id y carga todas las propiedades presentes del dto
    const product = await this.productRepository.preload({
      id,
      ...toUpdate,
    })

    if (!product)
      throw new NotFoundException('Product not foud');

    //Transactions: Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      if (images) {
        //eliminamos todas las productimages
        await queryRunner.manager.delete(ProductImage, { product: { id } })

        product.images = images.map(img => this.productImageRepository.create({ url: img }))

      } else {

      }

      product.user = user;
      await queryRunner.manager.save(product)

      await queryRunner.commitTransaction();
      await queryRunner.release();//ya no vuelve a funcionar el queryrunner

      // await this.productRepository.save(product);
      return product
    } catch (err) {

      await queryRunner.rollbackTransaction();
      this.handleDBException(err)
    }
  }

  async remove(id: string) {

    const product = await this.findOne(id);
    await this.productRepository.remove(product, {
    });

  }

  async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);

    return {
      ...rest,
      images: images.map(img => img.url)
    }
  }

  private handleDBException(error: any) {
    if (error.code === '23505')
      throw new BadRequestException(error.detail);

    this.logger.error(error)
    throw new InternalServerErrorException('Unexpected error,check server logs')
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');
    try {
      return await query
        .delete()
        .where({})
        .execute();
    } catch (error) {
      this.handleDBException(error)
    }
  }
}
