// PCB Housing for 83x45.5mm board
// OpenSCAD design for 3D printing

/* [Rendering Options] */
// What to render
part = "both"; // [bottom, lid, both, assembled]

/* [PCB Dimensions] */
pcb_length = 83;        // mm
pcb_width = 45.5;       // mm
pcb_corner_r = 6;       // mm
pcb_thickness = 1.6;    // mm (standard PCB)

/* [Housing Dimensions] */
wall_thickness = 2.5;   // mm
floor_thickness = 2;    // mm
lid_thickness = 2;      // mm
pcb_clearance = 1;      // mm (gap between PCB and walls/mounting structures)

/* [Boss / Standoff] */
boss_height = 4;        // mm (PCB height from floor)
boss_outer_d = 6;       // mm
boss_inner_d = 2.5;     // mm (for M3 tap or insert)

/* [USB Type-C Port] */
usbc_width = 13;        // mm (with rubber boot clearance)
usbc_height = 7;        // mm (with rubber boot clearance)
// USB port position: 38.334mm from left, 39.566mm from right
// Offset from center = (38.334 - 39.566) / 2 = -0.616mm (shifted left)
usbc_x_offset = -0.616; // mm (negative = left when looking at port)
usbc_z_offset = -1.6;   // mm (negative = lower)

/* [Molex 5557 Connector] */
molex_width = 10.8;     // mm
molex_height = 10.2;    // mm (protrusion from wall)
molex_depth = 14;       // mm (along PCB direction)
molex_spacing = 10.2;   // mm (center to center gap between connectors)
molex_latch_extra = 5;  // mm (extra height for latch)
molex_labels = ["LIGHT", "SENS2", "SENS1"];  // labels for each connector
label_size = 3.0;       // mm (text height)
label_depth = 0.8;      // mm (engraving depth)
label_spacing = 1.2;    // character spacing (1 = normal, >1 = wider)
label_weight = -0.05;   // mm (0 = normal, + = thicker, - = thinner)

/* [Lid Mounting] */
mount_wall_width = 14;       // mm (Y direction)
mount_wall_thickness = 5;    // mm (X direction, for screw thread)
mount_wall_height = 10;      // mm (Z direction)
mount_screw_d = 2.5;         // mm (for M3 tap)

/* [Calculated Values] */
// PCB cavity (where PCB sits, with clearance all around)
pcb_cavity_length = pcb_length + pcb_clearance * 2;
pcb_cavity_width = pcb_width + pcb_clearance * 2;

// Housing dimensions (includes mounting wall space at short sides)
inner_length = pcb_cavity_length + mount_wall_thickness * 2;
inner_width = pcb_cavity_width;
outer_length = inner_length + wall_thickness * 2;
outer_width = inner_width + wall_thickness * 2;

// Height from floor to PCB top surface
pcb_top_z = boss_height + pcb_thickness;

// Total internal height
component_height = max(molex_height + molex_latch_extra, 15);
inner_height = boss_height + pcb_thickness + component_height;
outer_height = floor_thickness + inner_height + lid_thickness;

// M3 hole positions (at corner radius centers, relative to PCB center)
m3_positions = [
    [pcb_corner_r - pcb_length/2, pcb_corner_r - pcb_width/2],
    [pcb_length/2 - pcb_corner_r, pcb_corner_r - pcb_width/2],
    [pcb_corner_r - pcb_length/2, pcb_width/2 - pcb_corner_r],
    [pcb_length/2 - pcb_corner_r, pcb_width/2 - pcb_corner_r]
];

// Molex connector positions (X offset from center)
molex_positions = [
    -molex_spacing - molex_width,
    0,
    molex_spacing + molex_width
];

$fn = 64;

// ============================================
// MODULES
// ============================================

module rounded_rect(length, width, r) {
    offset(r = r)
        offset(r = -r)
            square([length, width], center = true);
}

module rounded_box(length, width, height, r) {
    linear_extrude(height)
        rounded_rect(length, width, r);
}

module boss() {
    difference() {
        cylinder(h = boss_height, d = boss_outer_d);
        cylinder(h = boss_height + 1, d = boss_inner_d);
    }
}

// ============================================
// BOTTOM PART
// ============================================

module bottom() {
    difference() {
        union() {
            // Floor plate (same size as lid)
            rounded_box(outer_length, outer_width, floor_thickness, pcb_corner_r + wall_thickness + mount_wall_thickness);
            
            // Boss standoffs for PCB
            translate([0, 0, floor_thickness]) {
                for (pos = m3_positions) {
                    translate([pos[0], pos[1], 0])
                        boss();
                }
            }
            
            // Mounting walls (inside lid walls, outside PCB cavity)
            // Left side
            translate([-pcb_cavity_length/2 - mount_wall_thickness, -mount_wall_width/2, floor_thickness])
                cube([mount_wall_thickness, mount_wall_width, mount_wall_height]);
            
            // Right side
            translate([pcb_cavity_length/2, -mount_wall_width/2, floor_thickness])
                cube([mount_wall_thickness, mount_wall_width, mount_wall_height]);
        }
        
        // Horizontal screw holes in mounting walls (threaded)
        screw_z = floor_thickness + mount_wall_height / 2;
        
        // Left wall hole
        translate([-outer_length/2 - 1, 0, screw_z])
            rotate([0, 90, 0])
                cylinder(h = wall_thickness + mount_wall_thickness + 2, d = mount_screw_d);
        
        // Right wall hole
        translate([pcb_cavity_length/2 - 1, 0, screw_z])
            rotate([0, 90, 0])
                cylinder(h = wall_thickness + mount_wall_thickness + 2, d = mount_screw_d);
    }
}

// ============================================
// LID PART
// ============================================

module lid() {
    m3_clearance = 3.4;
    screw_z = mount_wall_height / 2;
    port_margin = 0.5;  // extra clearance for ports
    
    difference() {
        union() {
            // Top plate
            translate([0, 0, inner_height])
                rounded_box(outer_length, outer_width, lid_thickness, pcb_corner_r + wall_thickness + mount_wall_thickness);
            
            // Side walls
            difference() {
                rounded_box(outer_length, outer_width, inner_height, pcb_corner_r + wall_thickness + mount_wall_thickness);
                translate([0, 0, -0.1])
                    rounded_box(inner_length, inner_width, inner_height + 0.2, pcb_corner_r + mount_wall_thickness);
            }
        }
        
        // USB Type-C port cutout (offset from center)
        // Port starts at PCB top surface and goes UP
        translate([usbc_x_offset - usbc_width/2, -outer_width/2 - 1, pcb_top_z + usbc_z_offset - port_margin])
            cube([usbc_width, wall_thickness + 2, usbc_height + port_margin * 2]);
        
        // Molex 5557 connector cutouts
        // Port starts at PCB top surface and goes UP
        molex_latch_width = 5;  // latch opening width (center only)
        for (x_pos = molex_positions) {
            // Main connector opening (full width)
            translate([x_pos - (molex_width + 1)/2, outer_width/2 - wall_thickness - 1, pcb_top_z - port_margin])
                cube([molex_width + 1, wall_thickness + 2, molex_height + port_margin]);
            
            // Latch opening (center 5mm only, exactly molex_latch_extra height)
            translate([x_pos - molex_latch_width/2, outer_width/2 - wall_thickness - 1, pcb_top_z + molex_height])
                cube([molex_latch_width, wall_thickness + 2, molex_latch_extra]);
        }
        
        // Horizontal screw holes through short side walls (clearance holes)
        // Left wall
        translate([-outer_length/2 - 1, 0, screw_z])
            rotate([0, 90, 0])
                cylinder(h = wall_thickness + 2, d = m3_clearance);
        
        // Right wall
        translate([outer_length/2 - wall_thickness - 1, 0, screw_z])
            rotate([0, 90, 0])
                cylinder(h = wall_thickness + 2, d = m3_clearance);
        
        // Molex connector labels (engraved on top surface)
        for (i = [0:2]) {
            translate([molex_positions[i], outer_width/2 - wall_thickness - 5, inner_height + lid_thickness - label_depth + 0.1])
                linear_extrude(label_depth + 0.1)
                    offset(r = label_weight)
                        text(molex_labels[i], size = label_size, spacing = label_spacing, halign = "center", valign = "center", font = "Liberation Sans:style=Bold");
        }
    }
}

// ============================================
// RENDERING
// ============================================

if (part == "bottom") {
    bottom();
}
else if (part == "lid") {
    translate([0, 0, inner_height + lid_thickness])
        rotate([180, 0, 0])
            lid();
}
else if (part == "both") {
    translate([-(outer_length/2 + 10), 0, 0])
        bottom();
    
    translate([outer_length/2 + 10, 0, inner_height + lid_thickness])
        rotate([180, 0, 0])
            lid();
}
else if (part == "assembled") {
    color("lightblue", 0.8) bottom();
    
    color("lightyellow", 0.8)
    translate([0, 0, floor_thickness])
        lid();
}