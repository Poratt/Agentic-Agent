import { ApiProperty } from '@nestjs/swagger';

export class StrainSymbolDto {
  @ApiProperty({ description: 'Image URL of the symbol.', example: 'https://...' })
  url!: string;

  @ApiProperty({ description: 'Tooltip or alt text for the symbol.', example: 'פסטור קר' })
  alt!: string;
}

export class StrainDto {
  @ApiProperty({ description: 'Hebrew product or strain name.', example: 'גורילה גלו' })
  name!: string;

  @ApiProperty({ description: 'English product or strain name.', example: 'Gorilla Glue' })
  enName!: string;

  @ApiProperty({ description: 'Whether the visible row marks the product as new.', example: true })
  isNew!: boolean;

  @ApiProperty({ description: 'Visible review count and score text.', example: '(9) 4.4' })
  rating!: string;

  @ApiProperty({ description: 'Visible or expanded promotion deal text.', example: '3 ב-₪279' })
  deal!: string;

  @ApiProperty({ description: 'Marketer name.', example: 'קנטק' })
  marketer!: string;

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

  @ApiProperty({ description: 'Terpene details extracted from the expanded row.', example: '' })
  terpenes!: string;

  @ApiProperty({ description: 'Package type extracted from the expanded row.', example: 'שקית' })
  packageType!: string;

  @ApiProperty({ description: 'List of symbols associated with the strain.', type: [StrainSymbolDto] })
  symbols!: StrainSymbolDto[];

  @ApiProperty({ description: 'Thumbnail URL of the product image.', example: 'https://...' })
  imageUrl!: string;

  @ApiProperty({ description: 'Redirect URL of the product page.', example: 'https://...' })
  productUrl!: string;

  @ApiProperty({ description: 'MOH Cannabis category.', example: 'T22/C4' })
  category!: string;

  @ApiProperty({ description: 'Cannabis family.', example: 'indica' })
  family!: string;

  @ApiProperty({ description: 'Method of growing.', example: 'אינדור (נורות)' })
  growType!: string;

  @ApiProperty({ description: 'THC Percentage.', example: '24.2%-19.9%' })
  thc!: string;

  @ApiProperty({ description: 'CBD Percentage.', example: '4%-0%' })
  cbd!: string;
}

export class StrainHunterFetchResponseDto {
  @ApiProperty({
    description: 'Fetched and normalized strain items extracted from the configured Jane API source.',
    type: [StrainDto],
  })
  items!: StrainDto[];
}