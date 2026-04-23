"""
Port Terrain Generator for Blender
===================================
Generates an empty container port terrain inspired by Singapore-style ports.
Includes: land masses, quay walls, berth areas, container yard blocks,
internal roads, and surrounding water. No cranes or containers.

Usage: Open in Blender's Scripting editor and click "Run Script",
       or run via: blender terrain-port.blend --python generate_port_terrain.py
"""

import bpy
import bmesh
import math
from mathutils import Vector

# ---------------------------------------------------------------------------
# Configuration (units ≈ metres)
# ---------------------------------------------------------------------------

# Overall port dimensions
PORT_LENGTH = 1200       # along X (quay direction)
PORT_DEPTH = 600         # along Y (inland from quay edge)
WATER_EXTENT = 800       # how far the sea extends beyond the quay

# Quay / berth
QUAY_WALL_HEIGHT = 3.0   # height of quay edge above water
QUAY_WALL_THICKNESS = 4.0
NUM_BERTHS = 6           # number of berth sections along main quay
BERTH_GAP = 8            # gap between berth sections

# Container yard blocks
YARD_BLOCK_W = 140       # width of one yard block (along X)
YARD_BLOCK_D = 60        # depth of one yard block (along Y)
YARD_ROWS = 5            # rows of yard blocks inland
YARD_COLS = 7            # columns of yard blocks along quay
YARD_GAP_X = 18          # road width between blocks (X direction)
YARD_GAP_Y = 22          # road width between blocks (Y direction)
YARD_SETBACK = 60        # distance from quay edge to first yard row

# Basin (water channel between two wharves)
BASIN_WIDTH = 300
BASIN_LENGTH = 800
BASIN_OFFSET_X = 200     # start of basin from left edge

# Secondary wharf (right side of basin)
SECONDARY_WHARF_DEPTH = 250
SECONDARY_WHARF_LENGTH = BASIN_LENGTH

# Elevations
GROUND_LEVEL = 2.0       # port surface above water level 0
ROAD_LEVEL = 1.9         # roads slightly lower than yard
WATER_LEVEL = 0.0
SEABED_LEVEL = -8.0      # depth of berth water alongside quay

# Materials - colors
COL_CONCRETE = (0.72, 0.70, 0.67, 1.0)       # light grey concrete
COL_ASPHALT = (0.28, 0.28, 0.30, 1.0)        # dark asphalt roads
COL_QUAY_WALL = (0.55, 0.53, 0.50, 1.0)      # quay edge concrete
COL_YARD = (0.62, 0.60, 0.57, 1.0)           # yard surface (slightly different)
COL_WATER = (0.08, 0.22, 0.38, 1.0)          # deep ocean blue
COL_WATER_BASIN = (0.10, 0.28, 0.42, 1.0)    # slightly lighter basin water
COL_MARKING = (0.95, 0.95, 0.90, 1.0)        # white road markings
COL_BOLLARD = (0.15, 0.15, 0.15, 1.0)        # dark metal bollards
COL_FENDER = (0.10, 0.10, 0.10, 1.0)         # black rubber fenders
COL_APRON = (0.65, 0.63, 0.58, 1.0)          # quay apron (crane rail area)

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def clear_scene():
    """Remove all objects, meshes, and materials."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # Clean orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)


def make_material(name, color, roughness=0.8, metallic=0.0):
    """Create a simple Principled BSDF material."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
    return mat


def create_box(name, location, dimensions, material):
    """Create a box mesh at given location with given dimensions."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (dimensions[0], dimensions[1], dimensions[2])
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.append(material)
    return obj


def create_plane(name, location, size_x, size_y, material):
    """Create a flat plane (thin box)."""
    dims = (size_x, size_y, 0.05)
    return create_box(name, location, dims, material)


def create_quay_edge(name, start_x, end_x, y_pos, z_base, material):
    """Create a quay wall edge (raised concrete barrier along the berth)."""
    length = end_x - start_x
    center_x = (start_x + end_x) / 2.0
    loc = (center_x, y_pos, z_base + QUAY_WALL_HEIGHT / 2.0)
    dims = (length, QUAY_WALL_THICKNESS, QUAY_WALL_HEIGHT)
    return create_box(name, loc, dims, material)


def create_bollard(name, location, material):
    """Create a simple bollard (small cylinder on the quay edge)."""
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.3, depth=0.8,
        location=(location[0], location[1], location[2] + 0.4)
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def create_fender(name, location, material):
    """Create a rubber fender on the quay wall face."""
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.5, depth=2.0,
        location=location,
        rotation=(math.pi / 2, 0, 0)
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def create_road_marking(name, location, length, width, material):
    """Create a road marking stripe."""
    dims = (length, width, 0.02)
    loc = (location[0], location[1], ROAD_LEVEL + 0.03)
    return create_box(name, loc, dims, material)


# ---------------------------------------------------------------------------
# Main port construction
# ---------------------------------------------------------------------------

def build_port():
    clear_scene()

    # ---- Materials ----
    mat_concrete = make_material("Concrete", COL_CONCRETE, roughness=0.85)
    mat_asphalt = make_material("Asphalt", COL_ASPHALT, roughness=0.9)
    mat_quay = make_material("QuayWall", COL_QUAY_WALL, roughness=0.7)
    mat_yard = make_material("YardSurface", COL_YARD, roughness=0.82)
    mat_water = make_material("Water", COL_WATER, roughness=0.1, metallic=0.0)
    mat_water_basin = make_material("WaterBasin", COL_WATER_BASIN, roughness=0.1)
    mat_marking = make_material("RoadMarking", COL_MARKING, roughness=0.6)
    mat_bollard = make_material("Bollard", COL_BOLLARD, roughness=0.4, metallic=0.7)
    mat_fender = make_material("Fender", COL_FENDER, roughness=0.95)
    mat_apron = make_material("QuayApron", COL_APRON, roughness=0.8)

    # Collections for organisation
    port_col = bpy.data.collections.new("Port_Terrain")
    bpy.context.scene.collection.children.link(port_col)
    water_col = bpy.data.collections.new("Water")
    bpy.context.scene.collection.children.link(water_col)
    details_col = bpy.data.collections.new("Port_Details")
    bpy.context.scene.collection.children.link(details_col)

    def link_to(col, obj):
        """Move object from scene collection to target collection."""
        for c in obj.users_collection:
            c.objects.unlink(obj)
        col.objects.link(obj)

    # ==================================================================
    # 1. WATER / SEA
    # ==================================================================
    sea_size_x = PORT_LENGTH + WATER_EXTENT * 2
    sea_size_y = PORT_DEPTH + WATER_EXTENT * 2
    sea = create_plane(
        "Sea",
        location=(PORT_LENGTH / 2, -WATER_EXTENT / 2, WATER_LEVEL),
        size_x=sea_size_x,
        size_y=sea_size_y,
        material=mat_water
    )
    link_to(water_col, sea)

    # Basin water (channel between two wharves)
    basin_water = create_box(
        "Basin_Water",
        location=(
            BASIN_OFFSET_X + BASIN_LENGTH / 2,
            -BASIN_WIDTH / 2,
            WATER_LEVEL - 0.1
        ),
        dimensions=(BASIN_LENGTH, BASIN_WIDTH, 0.15),
        material=mat_water_basin
    )
    link_to(water_col, basin_water)

    # ==================================================================
    # 2. MAIN WHARF (LEFT/NORTH SIDE) - primary port land mass
    # ==================================================================
    main_wharf = create_box(
        "MainWharf_Ground",
        location=(PORT_LENGTH / 2, PORT_DEPTH / 2, GROUND_LEVEL / 2),
        dimensions=(PORT_LENGTH, PORT_DEPTH, GROUND_LEVEL),
        material=mat_concrete
    )
    link_to(port_col, main_wharf)

    # Quay apron (the flat strip along the quay edge where cranes would run)
    apron_depth = 40  # width of the apron strip
    apron = create_box(
        "MainWharf_Apron",
        location=(PORT_LENGTH / 2, apron_depth / 2, GROUND_LEVEL + 0.02),
        dimensions=(PORT_LENGTH, apron_depth, 0.05),
        material=mat_apron
    )
    link_to(port_col, apron)

    # Crane rail grooves on the apron (two parallel lines)
    for i, rail_y in enumerate([8, 32]):
        rail = create_box(
            f"CraneRail_Main_{i}",
            location=(PORT_LENGTH / 2, rail_y, GROUND_LEVEL + 0.04),
            dimensions=(PORT_LENGTH - 20, 0.8, 0.06),
            material=mat_bollard
        )
        link_to(details_col, rail)

    # Quay wall along the main berth (southern edge facing water)
    quay_main = create_quay_edge(
        "QuayWall_Main",
        start_x=0, end_x=PORT_LENGTH,
        y_pos=-QUAY_WALL_THICKNESS / 2,
        z_base=WATER_LEVEL,
        material=mat_quay
    )
    link_to(port_col, quay_main)

    # ==================================================================
    # 3. SECONDARY WHARF (RIGHT/SOUTH SIDE OF BASIN)
    # ==================================================================
    sec_wharf_y_start = -BASIN_WIDTH
    sec_wharf = create_box(
        "SecondaryWharf_Ground",
        location=(
            BASIN_OFFSET_X + SECONDARY_WHARF_LENGTH / 2,
            sec_wharf_y_start - SECONDARY_WHARF_DEPTH / 2,
            GROUND_LEVEL / 2
        ),
        dimensions=(SECONDARY_WHARF_LENGTH, SECONDARY_WHARF_DEPTH, GROUND_LEVEL),
        material=mat_concrete
    )
    link_to(port_col, sec_wharf)

    # Secondary quay apron
    sec_apron = create_box(
        "SecondaryWharf_Apron",
        location=(
            BASIN_OFFSET_X + SECONDARY_WHARF_LENGTH / 2,
            sec_wharf_y_start - apron_depth / 2,
            GROUND_LEVEL + 0.02
        ),
        dimensions=(SECONDARY_WHARF_LENGTH, apron_depth, 0.05),
        material=mat_apron
    )
    link_to(port_col, sec_apron)

    # Secondary crane rails
    for i, rail_offset in enumerate([8, 32]):
        rail = create_box(
            f"CraneRail_Sec_{i}",
            location=(
                BASIN_OFFSET_X + SECONDARY_WHARF_LENGTH / 2,
                sec_wharf_y_start - rail_offset,
                GROUND_LEVEL + 0.04
            ),
            dimensions=(SECONDARY_WHARF_LENGTH - 20, 0.8, 0.06),
            material=mat_bollard
        )
        link_to(details_col, rail)

    # Secondary quay wall (northern edge facing basin)
    sec_quay = create_quay_edge(
        "QuayWall_Secondary",
        start_x=BASIN_OFFSET_X,
        end_x=BASIN_OFFSET_X + SECONDARY_WHARF_LENGTH,
        y_pos=sec_wharf_y_start + QUAY_WALL_THICKNESS / 2,
        z_base=WATER_LEVEL,
        material=mat_quay
    )
    link_to(port_col, sec_quay)

    # ==================================================================
    # 4. FINGER PIERS / JETTIES (extending into the basin)
    # ==================================================================
    num_piers = 3
    pier_width = 50
    pier_length = BASIN_WIDTH * 0.6
    pier_spacing = BASIN_LENGTH / (num_piers + 1)

    for i in range(num_piers):
        px = BASIN_OFFSET_X + pier_spacing * (i + 1)
        pier = create_box(
            f"Pier_{i+1}",
            location=(px, -pier_length / 2, GROUND_LEVEL / 2),
            dimensions=(pier_width, pier_length, GROUND_LEVEL),
            material=mat_concrete
        )
        link_to(port_col, pier)

        # Quay walls on both sides of the pier
        for side, sy in [("Left", -QUAY_WALL_THICKNESS / 2), ("Right", QUAY_WALL_THICKNESS / 2)]:
            pw = create_box(
                f"PierWall_{i+1}_{side}",
                location=(
                    px + (pier_width / 2 if side == "Right" else -pier_width / 2),
                    -pier_length / 2,
                    WATER_LEVEL + QUAY_WALL_HEIGHT / 2
                ),
                dimensions=(QUAY_WALL_THICKNESS, pier_length, QUAY_WALL_HEIGHT),
                material=mat_quay
            )
            link_to(port_col, pw)

    # ==================================================================
    # 5. CONTAINER YARD BLOCKS (main wharf)
    # ==================================================================
    yard_start_x = 30  # offset from left edge
    yard_start_y = YARD_SETBACK

    for row in range(YARD_ROWS):
        for col in range(YARD_COLS):
            bx = yard_start_x + col * (YARD_BLOCK_W + YARD_GAP_X) + YARD_BLOCK_W / 2
            by = yard_start_y + row * (YARD_BLOCK_D + YARD_GAP_Y) + YARD_BLOCK_D / 2

            if bx + YARD_BLOCK_W / 2 > PORT_LENGTH - 20:
                continue

            block = create_box(
                f"YardBlock_Main_{row}_{col}",
                location=(bx, by, GROUND_LEVEL + 0.03),
                dimensions=(YARD_BLOCK_W, YARD_BLOCK_D, 0.06),
                material=mat_yard
            )
            link_to(port_col, block)

    # ==================================================================
    # 6. CONTAINER YARD BLOCKS (secondary wharf)
    # ==================================================================
    sec_yard_start_y = sec_wharf_y_start - apron_depth - 20
    sec_yard_rows = 2
    sec_yard_cols = 4

    for row in range(sec_yard_rows):
        for col in range(sec_yard_cols):
            bx = BASIN_OFFSET_X + 30 + col * (YARD_BLOCK_W + YARD_GAP_X) + YARD_BLOCK_W / 2
            by = sec_yard_start_y - row * (YARD_BLOCK_D + YARD_GAP_Y) - YARD_BLOCK_D / 2

            if bx + YARD_BLOCK_W / 2 > BASIN_OFFSET_X + SECONDARY_WHARF_LENGTH - 20:
                continue

            block = create_box(
                f"YardBlock_Sec_{row}_{col}",
                location=(bx, by, GROUND_LEVEL + 0.03),
                dimensions=(YARD_BLOCK_W, YARD_BLOCK_D, 0.06),
                material=mat_yard
            )
            link_to(port_col, block)

    # ==================================================================
    # 7. INTERNAL ROADS (between yard blocks)
    # ==================================================================
    # Main horizontal roads (between yard rows)
    for row in range(YARD_ROWS + 1):
        ry = yard_start_y + row * (YARD_BLOCK_D + YARD_GAP_Y) - YARD_GAP_Y / 2
        if row == 0:
            ry = yard_start_y - YARD_GAP_Y / 2
        road = create_box(
            f"Road_H_Main_{row}",
            location=(PORT_LENGTH / 2, ry, ROAD_LEVEL),
            dimensions=(PORT_LENGTH - 20, YARD_GAP_Y, 0.04),
            material=mat_asphalt
        )
        link_to(port_col, road)

        # Road center line marking
        marking = create_road_marking(
            f"Marking_H_{row}",
            location=(PORT_LENGTH / 2, ry),
            length=PORT_LENGTH - 40,
            width=0.3,
            material=mat_marking
        )
        link_to(details_col, marking)

    # Main vertical roads (between yard columns)
    for col in range(YARD_COLS + 1):
        rx = yard_start_x + col * (YARD_BLOCK_W + YARD_GAP_X) - YARD_GAP_X / 2
        if col == 0:
            rx = yard_start_x - YARD_GAP_X / 2
        road_len_y = YARD_ROWS * (YARD_BLOCK_D + YARD_GAP_Y)
        road = create_box(
            f"Road_V_Main_{col}",
            location=(
                rx,
                yard_start_y + road_len_y / 2 - YARD_GAP_Y / 2,
                ROAD_LEVEL
            ),
            dimensions=(YARD_GAP_X, road_len_y, 0.04),
            material=mat_asphalt
        )
        link_to(port_col, road)

    # Main perimeter road (along the back of the port)
    back_road_y = yard_start_y + YARD_ROWS * (YARD_BLOCK_D + YARD_GAP_Y) + 10
    perimeter_road = create_box(
        "Road_Perimeter_Back",
        location=(PORT_LENGTH / 2, back_road_y, ROAD_LEVEL),
        dimensions=(PORT_LENGTH, 15, 0.04),
        material=mat_asphalt
    )
    link_to(port_col, perimeter_road)

    # Gate area (entrance/exit at the back)
    gate_x = PORT_LENGTH / 2
    gate = create_box(
        "Gate_Area",
        location=(gate_x, back_road_y + 25, GROUND_LEVEL + 0.02),
        dimensions=(80, 35, 0.05),
        material=mat_asphalt
    )
    link_to(port_col, gate)

    # Gate lane markings
    for lane in range(-3, 4):
        lane_marking = create_road_marking(
            f"GateLane_{lane+3}",
            location=(gate_x + lane * 10, back_road_y + 25),
            length=0.4,
            width=30,
            material=mat_marking
        )
        link_to(details_col, lane_marking)

    # ==================================================================
    # 8. BOLLARDS along quay edges
    # ==================================================================
    bollard_spacing = 25
    num_bollards = int(PORT_LENGTH / bollard_spacing)
    for i in range(num_bollards):
        bx = bollard_spacing / 2 + i * bollard_spacing
        bollard = create_bollard(
            f"Bollard_Main_{i}",
            location=(bx, 2.0, GROUND_LEVEL),
            material=mat_bollard
        )
        link_to(details_col, bollard)

    # Bollards on secondary wharf
    num_sec_bollards = int(SECONDARY_WHARF_LENGTH / bollard_spacing)
    for i in range(num_sec_bollards):
        bx = BASIN_OFFSET_X + bollard_spacing / 2 + i * bollard_spacing
        bollard = create_bollard(
            f"Bollard_Sec_{i}",
            location=(bx, sec_wharf_y_start - 2.0, GROUND_LEVEL),
            material=mat_bollard
        )
        link_to(details_col, bollard)

    # ==================================================================
    # 9. FENDERS along quay walls
    # ==================================================================
    fender_spacing = 40
    num_fenders = int(PORT_LENGTH / fender_spacing)
    for i in range(num_fenders):
        fx = fender_spacing / 2 + i * fender_spacing
        fender = create_fender(
            f"Fender_Main_{i}",
            location=(fx, -QUAY_WALL_THICKNESS, GROUND_LEVEL - 0.5),
            material=mat_fender
        )
        link_to(details_col, fender)

    # ==================================================================
    # 10. BREAKWATER / SEAWALL (surrounding the basin entrance)
    # ==================================================================
    # Left breakwater arm
    bw_left = create_box(
        "Breakwater_Left",
        location=(BASIN_OFFSET_X - 15, -BASIN_WIDTH / 2, GROUND_LEVEL * 0.6),
        dimensions=(12, BASIN_WIDTH + 40, GROUND_LEVEL * 1.2),
        material=mat_quay
    )
    link_to(port_col, bw_left)

    # Right breakwater arm
    bw_right = create_box(
        "Breakwater_Right",
        location=(
            BASIN_OFFSET_X + BASIN_LENGTH + 15,
            -BASIN_WIDTH / 2,
            GROUND_LEVEL * 0.6
        ),
        dimensions=(12, BASIN_WIDTH + 40, GROUND_LEVEL * 1.2),
        material=mat_quay
    )
    link_to(port_col, bw_right)

    # ==================================================================
    # 11. UTILITY / ADMIN AREA (small raised platform at end of port)
    # ==================================================================
    admin_area = create_box(
        "Admin_Area",
        location=(PORT_LENGTH - 60, PORT_DEPTH - 60, GROUND_LEVEL + 0.1),
        dimensions=(100, 80, 0.2),
        material=mat_concrete
    )
    link_to(port_col, admin_area)

    # ==================================================================
    # 12. LIGHTING FOUNDATION PADS (where light towers would stand)
    # ==================================================================
    light_spacing_x = 160
    light_spacing_y = YARD_BLOCK_D + YARD_GAP_Y
    for col in range(int(PORT_LENGTH / light_spacing_x)):
        for row in range(YARD_ROWS + 1):
            lx = light_spacing_x / 2 + col * light_spacing_x
            ly = yard_start_y + row * light_spacing_y
            pad = create_box(
                f"LightPad_{col}_{row}",
                location=(lx, ly, GROUND_LEVEL + 0.05),
                dimensions=(3, 3, 0.1),
                material=mat_concrete
            )
            link_to(details_col, pad)

    # ==================================================================
    # 13. CAMERA & LIGHTING SETUP
    # ==================================================================
    # Sun light
    bpy.ops.object.light_add(type='SUN', location=(400, 200, 500))
    sun = bpy.context.active_object
    sun.name = "Sun"
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(45), math.radians(15), math.radians(-30))

    # Camera - aerial view
    bpy.ops.object.camera_add(
        location=(PORT_LENGTH / 2, -500, 700),
        rotation=(math.radians(35), 0, math.radians(0))
    )
    cam = bpy.context.active_object
    cam.name = "AerialCamera"
    cam.data.lens = 35
    bpy.context.scene.camera = cam

    # ==================================================================
    # 14. WORLD SETTINGS (sky)
    # ==================================================================
    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new("PortWorld")
        bpy.context.scene.world = world
    world.use_nodes = True
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs["Color"].default_value = (0.53, 0.72, 0.88, 1.0)  # light blue sky
        bg_node.inputs["Strength"].default_value = 1.0

    # ==================================================================
    # 15. RENDER SETTINGS
    # ==================================================================
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.cycles.samples = 64
    bpy.context.scene.render.resolution_x = 1920
    bpy.context.scene.render.resolution_y = 1080

    print("=" * 60)
    print("  Port terrain generated successfully!")
    print(f"  Objects created: {len(bpy.data.objects)}")
    print(f"  Collections: Port_Terrain, Water, Port_Details")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    build_port()
