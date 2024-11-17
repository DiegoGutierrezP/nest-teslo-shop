// import { PartialType } from '@nestjs/mapped-types';
import { PartialType } from '@nestjs/swagger';//for documentation
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) { }
