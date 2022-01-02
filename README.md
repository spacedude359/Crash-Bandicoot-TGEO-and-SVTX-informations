# Crash-Bandicoot-TGEO-and-SVTX-informations
Written in entirely Javascript Document Object Model

TGEO formats -
  Item 1 - Header and Structure informations
  0x0  Polygon Count    C
  0x4  X Size           -
  0x8  Y Size           -
  0xC  Z Size           -
  0x10 Structure Count  SC
  0x14 Structure Data   (SC * 4)
  
Structure format -
  RRRRRRRR GGGGGGGG BBBBBBBB TLLBXXXX
  if T = 1 then it adds more information
  
  0EEEEEED DDDDDCCC CCCBBBBB BAAAAAA1
  UUUUUUUU UURRSSFF FFFYYYYY YY?FFFFF

  Item 2 - Polygons Data (C * 8)
  
  AAAAAAAA AAAAAAAA BBBBBBBB BBBBBBBB CCCCCCCC CCCCCCCC SSSSSSSS SSSSSSSS
  
SVTX formats -
  Every items are frames
  0x0  Vertices Count             C
  0x4  Model EID                  -
  0x8  Offset X                   -
  0xC  Offset Y                   -
  0x10 Offset Z                   -
  0x14 Collision Point 1 X        -
  0x18 Collision Point 1 Y        -
  0x1C Collision Point 1 Z        -
  0x20 Collision Point 2 X        -
  0x24 Collision Point 2 Y        -
  0x28 Collision Point 2 Z        -
  0x2C Collision Offset X         -
  0x30 Collision Offset Y         -
  0x34 Collision Offset Z         -
  0x38 Vertices Data (C * 6)
  
  Vertices Data format
   XXXXXXXX YYYYYYY ZZZZZZZZ XXXXXXXX YYYYYYY ZZZZZZZZ
   
  After Vertices Data theres another formats
  0x38 + (C * 6) Unknown
  
   if Length >= 56 + (C * 6) + 4
  0x3A + (C * 6) Unknown2
