import { ApiProperty } from '@nestjs/swagger';

export class ExplorerStrainItemDto {
  @ApiProperty({ description: 'Hebrew product or strain name.', example: 'גורילה גלו' })
  hebName!: string;

  @ApiProperty({ description: 'English product or strain name.', example: 'Gorilla Glue' })
  enName!: string;

  @ApiProperty({ description: 'Whether the visible row marks the product as new.', example: true })
  isNew!: boolean;

  @ApiProperty({ description: 'Visible review count and score text.', example: '(9) 4.4' })
  rating!: string;

  @ApiProperty({ description: 'Visible or expanded promotion deal text.', example: '3 ב-₪279' })
  deal!: string;

  @ApiProperty({ description: 'Manufacturer name.', example: 'קנאפארמה' })
  manufacturer!: string;

  @ApiProperty({ description: 'Brand name.', example: 'לומה' })
  brand!: string;

  @ApiProperty({ description: 'Product expiry value.', example: '12/26' })
  expiry!: string;

  @ApiProperty({ description: 'Current displayed product price.', example: '₪99' })
  price!: string;

  @ApiProperty({ description: 'Catalog or crossed-out product price.', example: '₪199' })
  catalogPrice!: string;

  @ApiProperty({ description: 'First genetic parent extracted from the expanded row.', example: "Chem's Sister" })
  parent1!: string;

  @ApiProperty({ description: 'Second genetic parent extracted from the expanded row.', example: 'Sour Dubb' })
  parent2!: string;

  @ApiProperty({ description: 'Origin strain or genetics extracted from the expanded row.', example: 'GG4' })
  originStrain!: string;

  @ApiProperty({ description: 'Country of origin extracted from the expanded row.', example: 'קנדה' })
  countryOfOrigin!: string;

  @ApiProperty({ description: 'Terpene details extracted from the expanded row.', example: 'לא ידוע' })
  terpenes!: string;

  @ApiProperty({ description: 'Package type extracted from the expanded row.', example: 'שקית' })
  packageType!: string;
}

export class ExplorerFetchResponseDto {
  @ApiProperty({
    description: 'Fetched and normalized strain items extracted from the configured Jane API source.',
    type: [ExplorerStrainItemDto],
  })
  items!: ExplorerStrainItemDto[];
}
