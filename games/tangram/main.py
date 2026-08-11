"""Tangram puzzle.

Classic 7-piece tangram. Starts assembled as a square; click anywhere to
break it apart, then drag, rotate and flip the pieces to build any shape.

Rotate and flip are done with on-screen buttons (tap a piece to select it,
then tap Rotate/Flip) rather than right-click or keyboard, so the whole
game works the same on a touchscreen as it does with a mouse.

Runs as a normal desktop pygame app, and also in the browser via pygbag
(the asyncio main loop below is what pygbag needs).
"""
import asyncio
import math
import random

import pygame

WIDTH, HEIGHT = 900, 640
SCALE = 44  # pixels per grid unit
GRID_SIZE = 8  # the assembled square is an 8x8 grid

BG_COLOR = (245, 240, 226)
LINE_COLOR = (35, 35, 35)
TEXT_COLOR = (40, 40, 40)
TARGET_COLOR = (210, 200, 175)
SELECT_COLOR = (235, 180, 40)
BUTTON_COLOR = (217, 108, 79)
BUTTON_TEXT_COLOR = (255, 255, 255)

DRAG_THRESHOLD = 6  # pixels of movement before a press becomes a drag, not a tap

# Where the assembled square sits on screen (top-left corner of the grid).
ORIGIN_X = WIDTH / 2 - (GRID_SIZE * SCALE) / 2
ORIGIN_Y = HEIGHT / 2 - (GRID_SIZE * SCALE) / 2 + 20

# The 7 tans, defined as polygons on the 8x8 grid of the assembled square.
# This layout is a verified exact tiling (areas + shared edges checked).
PIECES_DATA = [
    ("Large triangle", (223, 79, 79), [(0, 0), (0, 8), (4, 4)]),
    ("Large triangle", (79, 130, 223), [(0, 8), (8, 8), (4, 4)]),
    ("Medium triangle", (231, 180, 55), [(4, 0), (8, 0), (8, 4)]),
    ("Small triangle", (86, 181, 116), [(2, 2), (6, 2), (4, 4)]),
    ("Small triangle", (176, 97, 207), [(8, 4), (8, 8), (6, 6)]),
    ("Square", (235, 132, 175), [(4, 4), (6, 2), (8, 4), (6, 6)]),
    ("Parallelogram", (69, 190, 196), [(0, 0), (4, 0), (6, 2), (2, 2)]),
]


class Piece:
    def __init__(self, number, name, color, grid_points):
        self.number = number
        self.name = name
        self.color = color

        cx = sum(p[0] for p in grid_points) / len(grid_points)
        cy = sum(p[1] for p in grid_points) / len(grid_points)
        # Points relative to the piece's own centroid, in pixels.
        self.local_points = [((x - cx) * SCALE, (y - cy) * SCALE) for x, y in grid_points]

        self.home_pos = (ORIGIN_X + cx * SCALE, ORIGIN_Y + cy * SCALE)
        self.pos = list(self.home_pos)
        self.angle = 0
        self.flipped = False
        self.drag_offset = (0, 0)

    def reset(self):
        self.pos = list(self.home_pos)
        self.angle = 0
        self.flipped = False

    def get_points(self):
        rad = math.radians(self.angle)
        cos_a, sin_a = math.cos(rad), math.sin(rad)
        pts = []
        for x, y in self.local_points:
            if self.flipped:
                x = -x
            rx = x * cos_a - y * sin_a
            ry = x * sin_a + y * cos_a
            pts.append((self.pos[0] + rx, self.pos[1] + ry))
        return pts

    def contains(self, mx, my):
        pts = self.get_points()
        inside = False
        j = len(pts) - 1
        for i, (xi, yi) in enumerate(pts):
            xj, yj = pts[j]
            if (yi > my) != (yj > my) and mx < (xj - xi) * (my - yi) / (yj - yi) + xi:
                inside = not inside
            j = i
        return inside

    def draw(self, surface, font, dragging=False, selected=False):
        pts = self.get_points()
        pygame.draw.polygon(surface, self.color, pts)
        if selected:
            pygame.draw.polygon(surface, SELECT_COLOR, pts, 4)
        else:
            pygame.draw.polygon(surface, LINE_COLOR, pts, 3 if dragging else 2)

        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        label = font.render(str(self.number), True, (20, 20, 20))
        badge_r = label.get_width() // 2 + 5
        pygame.draw.circle(surface, (255, 255, 255), (cx, cy), badge_r)
        pygame.draw.circle(surface, LINE_COLOR, (cx, cy), badge_r, 1)
        surface.blit(label, (cx - label.get_width() / 2, cy - label.get_height() / 2))


class Button:
    def __init__(self, rect, label):
        self.rect = pygame.Rect(rect)
        self.label = label

    def draw(self, surface, font):
        pygame.draw.rect(surface, BUTTON_COLOR, self.rect, border_radius=8)
        text = font.render(self.label, True, BUTTON_TEXT_COLOR)
        surface.blit(text, text.get_rect(center=self.rect.center))

    def contains(self, pos):
        return self.rect.collidepoint(pos)


def scatter(pieces):
    for p in pieces:
        p.pos = [random.randint(70, WIDTH - 70), random.randint(150, HEIGHT - 60)]
        p.angle = random.choice([0, 45, 90, 135, 180, 225, 270, 315])
        p.flipped = random.choice([False, False, False, True])


def reassemble(pieces):
    for p in pieces:
        p.reset()


def draw_target_outline(surface):
    x0, y0 = ORIGIN_X, ORIGIN_Y
    size = GRID_SIZE * SCALE
    pygame.draw.rect(surface, TARGET_COLOR, (x0, y0, size, size), 2)


async def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Tangram")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont(None, 26)
    small_font = pygame.font.SysFont(None, 22)
    title_font = pygame.font.SysFont(None, 34)
    button_font = pygame.font.SysFont(None, 28)

    pieces = [Piece(i + 1, *data) for i, data in enumerate(PIECES_DATA)]
    disassembled = False

    dragging = None  # piece currently being dragged
    pressed = None  # piece under the finger/cursor since the last press
    press_pos = (0, 0)
    selected = None  # piece the Rotate/Flip buttons apply to

    rotate_btn = Button((WIDTH / 2 - 170, HEIGHT - 66, 160, 50), "Rotate 45")
    flip_btn = Button((WIDTH / 2 + 10, HEIGHT - 66, 160, 50), "Flip")

    def select_piece(piece):
        nonlocal selected
        selected = piece
        if piece is not None:
            pieces.remove(piece)
            pieces.append(piece)

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mx, my = event.pos
                if not disassembled:
                    scatter(pieces)
                    disassembled = True
                elif selected is not None and rotate_btn.contains((mx, my)):
                    selected.angle = (selected.angle + 45) % 360
                elif selected is not None and flip_btn.contains((mx, my)):
                    selected.flipped = not selected.flipped
                else:
                    hit = None
                    for p in reversed(pieces):
                        if p.contains(mx, my):
                            hit = p
                            break
                    if hit is not None:
                        pressed = hit
                        press_pos = (mx, my)
                        pieces.remove(hit)
                        pieces.append(hit)
                    else:
                        select_piece(None)

            elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
                if dragging is not None:
                    select_piece(dragging)
                elif pressed is not None:
                    # a press that never moved beyond the drag threshold = a tap
                    select_piece(None if selected is pressed else pressed)
                dragging = None
                pressed = None

            elif event.type == pygame.MOUSEMOTION:
                mx, my = event.pos
                if dragging is not None:
                    dragging.pos[0] = mx - dragging.drag_offset[0]
                    dragging.pos[1] = my - dragging.drag_offset[1]
                elif pressed is not None:
                    dx, dy = mx - press_pos[0], my - press_pos[1]
                    if dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD:
                        dragging = pressed
                        dragging.drag_offset = (mx - dragging.pos[0], my - dragging.pos[1])

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_a:
                    reassemble(pieces)
                    disassembled = False
                    select_piece(None)
                elif event.key == pygame.K_s and disassembled:
                    scatter(pieces)
                    select_piece(None)

        screen.fill(BG_COLOR)

        if not disassembled:
            draw_target_outline(screen)
            msg = title_font.render("Tangram", True, TEXT_COLOR)
            screen.blit(msg, (WIDTH / 2 - msg.get_width() / 2, 30))
            hint = font.render("Tap anywhere to break the square apart!", True, TEXT_COLOR)
            screen.blit(hint, (WIDTH / 2 - hint.get_width() / 2, 75))
        else:
            hint = small_font.render(
                "Drag a piece to move it. Tap it once to select it, then use the buttons below.",
                True,
                TEXT_COLOR,
            )
            screen.blit(hint, (WIDTH / 2 - hint.get_width() / 2, 12))

        for p in pieces:
            p.draw(screen, font, dragging=(p is dragging), selected=(p is selected))

        if selected is not None:
            rotate_btn.draw(screen, button_font)
            flip_btn.draw(screen, button_font)

        pygame.display.flip()
        clock.tick(60)
        await asyncio.sleep(0)

    pygame.quit()


if __name__ == "__main__":
    asyncio.run(main())
