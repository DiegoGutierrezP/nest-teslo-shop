import { BadRequestException, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileService } from './file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { fileNamer, fileFilter } from './helpers';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Files')
@Controller('file')
export class FileController {

  constructor(
    private readonly fileService: FileService,
    private readonly cofingService: ConfigService
  ) { }

  @Post('product')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter, //no laza una exception , solo valida si deja o no pasar el archivo
    // limits: { fileSize: 1000 },
    storage: diskStorage({
      destination: './static/products',
      filename: fileNamer
    })
  }))
  uploadProductFile(
    @UploadedFile() file: Express.Multer.File
  ) {

    if (!file) {
      throw new BadRequestException('make sure that file is an image');
    }

    const secureUrl = `${this.cofingService.get('HOST_API')}/file/product/${file.filename}`

    return {
      secureUrl
    };
  }

  @Get('product/:imageName')
  findProductImage(
    @Res() res: Response,
    @Param('imageName') imageName: string
  ) {
    const path = this.fileService.getStaticProductImage(imageName);

    res.sendFile(path)
  }
}
