    var SVTX_frame = 0;
    var eid_charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_"    
    const __structinfo = ["Structure", "RGB", "Blend mode", "Double-Sided", "CLUT X", "Entry ID", "UV Index", "Color mode", "Segment", "X Offset Unit", "CLUT Y", "Y Offset Unit"]
    const __polyinfo = ["Polygon","A KeyFrame Index", "B KeyFrame Index", "C KeyFrame Index", "Structure Index"];
    const __animationinfo = ["Keyframe", "Vertex Position", "Vertex Normal"]

    var SVTX_keyframes_table;
    
    const  __colormode = ["4bpp", "8bpp", "16bpp"];
    const __blendmode = ["Transparency", "Additive", "Subtractive", "Solid"];

    var temporary_data, __T1, __T2;

    function eidtoname(value) {
        let char1 = ((value >>> 25) & 0x3F)
        let char2 = ((value >>> 19) & 0x3F)
        let char3 = ((value >>> 13) & 0x3F)
        let char4 = ((value >>> 7) & 0x3F)
        let char5 = ((value >>> 1) & 0x3F)
        return eid_charset[char1] + eid_charset[char2] + eid_charset[char3] + eid_charset[char4] + eid_charset[char5];
    };

    function u8(n) {
        return n & 0xFF;
    };

    function u16(n) {
        return n & 0xFFFF;
    };

    function u32(n) {
        return n & 0xFFFFFFFF;
    };

    function int8(value) {
        value = u8(value);
        let a = (value & 0x80) == 0x80; 
        let b = value & 0x7F;
        return a && -0x80 + b || !a && b;
    };

    function int16(value) {
        value = u16(value);
        let a = (value & 0x8000) == 0x8000;
        let b =  value & 0x7FFF;
        return a && -0x8000 + b || !a && b;
    }; 

    function int32(value) {
        value = u32(value);
        let a = (value & 0x80000000) == 0x80000000;
        let b =  value & 0x7FFFFFFF;
        return a && -0x80000000 + b || !a && b;
    }; 

    function sint32(value) {
        let numbers = value & 0x7FFFFFFF;
        return Math.abs(value) != value && (0^numbers) + 0x80000000 || numbers;
    };

    function ReadU16(index, address) {
        return (index[address + 1] << 8) | index[address];
    };

    function ReadU24(index, address) {
        return (index[address + 2] << 16) | (index[address + 1] << 8) | (index[address]);
    };

    function ReadU32(index, address) {
        return (index[address + 3] << 24) | (index[address + 2] << 16) | (index[address + 1] << 8) | (index[address]);
    };

    function BReadU32(index, address) {
        return (index[address] << 24) | (index[address + 1] << 16) | (index[address + 2] << 8) | (index[address + 3]);
  
    };

    function ReverseOrder32(value) { 
        return (value & 0xFF000000) >>> 24 | (value & 0xFF0000) >>> 8 | (value & 0xFF00) << 8 | (value & 0xFF) << 24
    }

    var input = document.getElementById("file");

    function openfile(evt) {
      var files = input.files;
      fileData = new Blob([files[0]]);
      var promise = new Promise(getBuffer(fileData));
      promise.then(function(data) {
          if (temporary_data) {init(temporary_data, data); delete temporary_data;};
          if (!temporary_data) {temporary_data = data};
        })
        .catch(function(err) {
        console.log('Error: ',err);
      });
    };
  
    function getBuffer(fileData) {
        return function(resolve) {
        var reader = new FileReader();
        reader.readAsArrayBuffer(fileData);
            reader.onload = function() {
                var arrayBuffer = reader.result
                var bytes = new Uint8Array(arrayBuffer);
                resolve(bytes);
            };
        };
    };

    input.addEventListener('change', openfile, false);

    function offset(index, addressA, addressB) { 
        let d = [];
        for (x=addressA; x<addressB; x++) {
            d.push(index[x]);
        };
        return d
    };

    function entry(data) {
        let magic_number = ReadU32(data, 0);
        if (magic_number != 0x100FFFF) {
            alert("Oh uh! Magic number doesn't match the file!");
        };
        let EID = ReadU32(data, 0x4);
        let Type = ReadU32(data, 0x8);
        let ItemCount = ReadU32(data, 0xC);
        let ItemOffsets = [];
        let Items = [];
        if (ItemCount != 0) {
            for (i = 0; i<ItemCount; i++) {
                ItemOffsets.push(ReadU32(data, 0x10 + (i * 4)));
            };
        } else {
              alert("There's no items in enty data.");
        };
        for (i = 0; i<ItemOffsets.length; i++) {
            let item1 = ItemOffsets[i];
            let item2 = ItemOffsets[i + 1];
            if (item1 && item2) {
               Items.push(offset(data, item1, item2));
            };
            if (item1 && !item2) {
                Items.push(offset(data, item1, data.length));
            };
        };
            return {
                Type: Type, 
                EID: eidtoname(EID), 
                Items: Items
            };
    };

    function Vector3(x, y, z) { 
        return {
            x: x,
            y: y,
            z: z,
        };
    };

    function Color3(r, g, b) {
        return {
            r: r,
            g: g,
            b: b,
        };
    };

    function TGEO__Object(entry) {
        let tgeo = Object.create(constructorTGEO);
        let model_header = entry.Items[0];
        let model_polygons = entry.Items[1];
        tgeo.polycount = ReadU32(model_header, 0);
        tgeo.scale = Vector3(ReadU32(model_header, 0x4), ReadU32(model_header, 0x8), ReadU32(model_header, 0xC));
        tgeo.structcount = ReadU32(model_header, 0x10);
        tgeo.polygons = [];
        tgeo.structures = [];

        for (i = 0; i<tgeo.polycount; i++) { 
            let pointer = i * 8;
            tgeo.polygons.push({
                A: ReadU16(model_polygons, pointer), 
                B: ReadU16(model_polygons, pointer + 2),
                C: ReadU16(model_polygons, pointer + 4),
                Structure: ReadU16(model_polygons, pointer + 6),
            });
        };

        for (i = 0; i<tgeo.structcount; i++) {
            // struct starts item 1 0x14;
            const sp = 0x14;
            tgeo.structures.push(ReadU32(model_header, sp + (i * 4)));
        };

        return tgeo;
    };

    var constructorTGEO = {
        StructureList: function() {
            let info = [];
            for (i = 0; i<this.structcount; i++) { 
                let struct_info = {};
                let structure = ReverseOrder32(this.structures[i]);
                let struct4 = structure & 0xFF;
                let RGB = (structure & 0xFFFFFF00) >>> 8;         
                // struct 4
                let is_textured = (struct4 & 0x80) == 0x80;
                 
                let __RGB = Color3((RGB & 0xFF0000) >>> 16, (RGB & 0xFF00) >>> 8, (RGB & 0xFF));
                struct_info.RGB = __RGB;
                struct_info.blendmode = (struct4 >>> 5) & 0x3;
                struct_info.n = (struct4 & 0x10) != 0;
                struct_info.clutx = struct4 & 0xF;

                if (is_textured) {
                    let texture_info = {};
                    texture_info.EID = eidtoname(this.structures[i + 1]);
                    let texinfo = this.structures[i + 2];
                    texture_info.uvindex = (texinfo >>> 22) & 0x3FF;
                    texture_info.colormode = (texinfo >>> 20) & 3;
                    texture_info.segment = (texinfo >>> 18) & 3;
                    texture_info.xoffu = (texinfo >>> 13) & 0x1F;
                    texture_info.cluty = (texinfo >>> 6) & 0x7F;
                    texture_info.yoffu = texinfo & 0x1F; 
                    
                    struct_info.texture_info = texture_info;
                    struct_info.index = i;
                    i += 2; // skip 2 structs;
                } else {
                    struct_info.index = i;
                };
                
                info.push(struct_info);
            };
            return info;
        }
    };

    function SVTX__Object() {
        let svtx = Object.create(constructorSVTX);
        svtx.frame = {};
        svtx.frame.header = {
            vertexcount: null,
            EID: null,
            Offset: null,
            XYZ1: null,
            XYZ2: null,
            Global: null,
        };
        svtx.frame.keyframes = [];
        return svtx
    };

    var constructorSVTX = {
        setFrame: function(i, entry) {
            let frame = entry.Items[i];
            let header = this.frame.header;
            let keyframes = [];

            // header
            header.vertexcount = ReadU32(frame, 0);
            header.EID = eidtoname(ReadU32(frame, 0x4));
            header.Offset = Vector3(ReadU32(frame, 0x8), ReadU32(frame, 0xC), ReadU32(frame, 0x10));
            header.XYZ1 = Vector3(ReadU32(frame, 0x14), ReadU32(frame, 0x18), ReadU32(frame, 0x1C));
            header.XYZ2 = Vector3(ReadU32(frame, 0x20), ReadU32(frame, 0x24), ReadU32(frame, 0x28));
            header.Global = Vector3(ReadU32(frame, 0x2C), ReadU32(frame, 0x30), ReadU32(frame, 0x34));
            this.frame.header = header;
            
            for (i=0;i<header.vertexcount;i++) {
                let pointer = 0x38 + (i * 6);
                keyframes.push({
                    Position: Vector3(frame[pointer], frame[pointer + 1], frame[pointer + 2]),
                    Normal: Vector3(int8(frame[pointer + 3]), int8(frame[pointer + 4]), int8(frame[pointer + 5]))
                });

            this.frame.keyframes = keyframes;
            };
        },
    };

    function table__Object() {
        let t = Object.create(constructortable);
        t.object = document.createElement('table');
        t.tableRow = null;
        t.tableCell = null;
        return t;
    };

    var constructortable = {
        insertRow: function() {
            this.tableRow = this.object.insertRow();
            return this.tableRow;
        },
        insertCell: function() {
            this.tableCell = this.tableRow.insertCell();
            this.tableCell.style.border = "1px solid black";
            return this.tableCell;
        },
        CellText: function(text) {
            this.tableCell = this.tableRow.insertCell();
            this.tableCell.style.border = "1px solid black";
            this.tableCell.appendChild(document.createTextNode(text));
        }
    }

    function init(data, data2) {
        var output = document.getElementById("outputA");
        var output2 = document.getElementById("outputB");
        var output3 = document.getElementById("outputC");

        __T1 = entry(data);  // svtx
        __T2 = entry(data2); // tgeo

        input.remove();

        if (__T1.Type == 2 && __T2.Type == 1) {
            let t0 = __T2;
            __T2 = __T1;
            __T1 = t0;
        } else {
            if (__T1.Type != 1) {
                alert("There's no animation entry file.");
            };
            if (__T2.Type != 2) {
                alert("There's no model entry file.");
            };  
        };

        let frames = __T1.Items.length;
        output.innerHTML = "Entry " + __T2.EID;



        
        var SVTX = SVTX__Object();
        var TGEO = TGEO__Object(__T2);

        const Left = document.getElementById("Leff");
        const Right = document.getElementById("Rigg");

        function __refresh_svtx(inc) {
            if (inc != undefined) {
                if (inc == false && SVTX_frame != 0) {
                    SVTX_frame -= 1;
                };
                if (inc == true && SVTX_frame < frames - 1) {
                    SVTX_frame += 1;
                };
            };
            output2.innerHTML = "Entry " + __T1.EID + ", " + frames + " frame(s) animation, " + "frame " + (SVTX_frame + 1) + "/" + frames;
           
            SVTX.setFrame(SVTX_frame, __T1);
            let frame = SVTX.frame
            let header = frame.header;
            let keyframes = frame.keyframes;
            
            if (header.EID != __T2.EID) {
                alert("SVTX and TGEO  doesn't match both.");
            };

            output3.innerHTML = `<br>Vertices Count ${header.vertexcount}<br>Offset ${header.Offset.x}, ${header.Offset.y}, ${header.Offset.z}<br>Collision Point 1 ${header.XYZ1.x}, ${header.XYZ1.y}, ${header.XYZ1.z}<br>Collision Point 2 ${header.XYZ2.x}, ${header.XYZ2.y}, ${header.XYZ2.z}<br>Collision Offset ${header.Global.x}, ${header.Global.y}, ${header.Global.z}`

            if(SVTX_keyframes_table != undefined) {
                SVTX_keyframes_table.remove();
            };

            SVTX_keyframes_table = document.createElement('table');
            SVTX_keyframes_table.style.border = "1px solid black";
            const title = SVTX_keyframes_table.insertRow();

            for (i = 0; i<__animationinfo.length; i++) {
                let anim = __animationinfo[i];
                const cell = title.insertCell();
                cell.style.border = "1px solid black";
                cell.appendChild(document.createTextNode(anim));
            };

            for (i = 0; i<header.vertexcount; i++) {
                const row = SVTX_keyframes_table.insertRow();
                let s = function(text) {
                    const cell = row.insertCell();
                    cell.style.border = "1px solid black";
                    cell.appendChild(document.createTextNode(text));
                };
                let f = keyframes[i];
                s(i);
                s(f.Position.x + "," + f.Position.y + "," + f.Position.z)
                s(f.Normal.x + "," + f.Normal.y + "," + f.Normal.z)
            };         

            Right.appendChild(SVTX_keyframes_table);
        };

        const button1 = document.createElement('button');
        button1.innerHTML = "- frame"
        Right.appendChild(button1);

        const button2 = document.createElement('button');
        button2.innerHTML = "+ frame"
        Right.appendChild(button2);

        button1.onclick = function () {
            console.log('negative frame');
            __refresh_svtx(false);
        };

        button2.onclick = function () {
            console.log('positive frame');
            __refresh_svtx(true);
        };

        __refresh_svtx();

        

        let structlist = TGEO.StructureList();


        let structure_table = table__Object();
        structure_table.object.style.border = '1px solid black';
        structure_table.insertRow();
        for (i = 0; i<__structinfo.length; i++) {
            let info = __structinfo[i];
            let cell = structure_table.insertCell();
            cell.appendChild(document.createTextNode(info));
        };

        for (i = 0; i<structlist.length; i++) {
            structure_table.insertRow();
            let object = structlist[i];
            structure_table.CellText(object.index);
            structure_table.CellText(object.RGB.r + ","+object.RGB.g+","+object.RGB.b);
            structure_table.CellText(__blendmode[object.blendmode]);
            structure_table.CellText(object.n == true && "X" || "");
            structure_table.CellText(object.clutx);
            if (object.texture_info) {
                structure_table.CellText(object.texture_info.EID);
                structure_table.CellText(object.texture_info.uvindex);
                structure_table.CellText(__colormode[object.texture_info.colormode]);
                structure_table.CellText(object.texture_info.segment);
                structure_table.CellText(object.texture_info.xoffu);
                structure_table.CellText(object.texture_info.cluty);
                structure_table.CellText(object.texture_info.yoffu);
            };
        };

        let polygon_table = table__Object();
        polygon_table.object.style.border = '1px solid black';
        polygon_table.insertRow();
        for (i = 0; i<__polyinfo.length; i++) {
            let info = __polyinfo[i];
            let cell = polygon_table.insertCell();
            cell.appendChild(document.createTextNode(info));
        };

        
        for (i = 0; i<TGEO.polycount; i++) {
            polygon_table.insertRow();
            let polygon = TGEO.polygons[i];
            polygon_table.CellText(i);
            polygon_table.CellText(polygon.A / 6);
            polygon_table.CellText(polygon.B / 6);
            polygon_table.CellText(polygon.C / 6);
            polygon_table.CellText(polygon.Structure);
        };

        Left.appendChild(structure_table.object);
        Left.appendChild(polygon_table.object);



    };