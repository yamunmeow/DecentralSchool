"""Sliding number puzzle.

Classic NxN sliding tile puzzle. Pick a grid size (3x3 up to whatever fits
the screen), then slide tiles into order around the one empty space.

Runs as a normal desktop pygame app, and also in the browser via pygbag
(the asyncio main loop below is what pygbag needs).
"""
import asyncio
import random

import pygame

WIDTH, HEIGHT = 820, 860
TOP_BAR_H = 130
BOARD_MARGIN = 24

BG_COLOR = (245, 240, 226)
TEXT_COLOR = (40, 40, 40)
MUTED_COLOR = (110, 104, 92)
TILE_COLOR = (235, 165, 95)
TILE_CORRECT_COLOR = (140, 200, 140)
LINE_COLOR = (35, 35, 35)
BUTTON_COLOR = (217, 108, 79)
BUTTON_TEXT = (255, 255, 255)

MIN_N = 3
MIN_TILE_PX = 40  # smallest a tile is allowed to get, so numbers stay legible

BOARD_AREA = min(WIDTH, HEIGHT - TOP_BAR_H) - 2 * BOARD_MARGIN
MAX_N = max(MIN_N, BOARD_AREA // MIN_TILE_PX)

MENU, PLAYING = "menu", "playing"


class Button:
    def __init__(self, rect, label):
        self.rect = pygame.Rect(rect)
        self.label = label

    def draw(self, surface, font):
        pygame.draw.rect(surface, BUTTON_COLOR, self.rect, border_radius=8)
        text = font.render(self.label, True, BUTTON_TEXT)
        surface.blit(text, text.get_rect(center=self.rect.center))

    def contains(self, pos):
        return self.rect.collidepoint(pos)


def solved_board(n):
    return list(range(1, n * n)) + [0]


def shuffle_board(n, shuffle_factor=25):
    board = solved_board(n)
    blank = n * n - 1
    last_delta = 0
    for _ in range(n * n * shuffle_factor):
        r, c = divmod(blank, n)
        options = []
        for dr, dc, delta in ((-1, 0, -n), (1, 0, n), (0, -1, -1), (0, 1, 1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and delta != -last_delta:
                options.append(delta)
        delta = random.choice(options)
        target = blank + delta
        board[blank], board[target] = board[target], board[blank]
        blank = target
        last_delta = delta
    return board


async def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Sliding Puzzle")
    clock = pygame.time.Clock()
    title_font = pygame.font.SysFont(None, 46)
    font = pygame.font.SysFont(None, 26)
    small_font = pygame.font.SysFont(None, 22)

    state = MENU
    n = 4
    board = []
    blank = 0
    moves = 0
    solved = False
    tile_size = 0
    origin = (0, 0)
    tile_font = font

    minus_btn = Button((WIDTH / 2 - 150, 300, 54, 54), "-")
    plus_btn = Button((WIDTH / 2 + 96, 300, 54, 54), "+")
    start_btn = Button((WIDTH / 2 - 90, 400, 180, 56), "Start")
    menu_btn = Button((WIDTH - 190, 20, 80, 36), "Menu")
    shuffle_btn = Button((WIDTH - 100, 20, 80, 36), "Shuffle")

    def layout_board():
        nonlocal tile_size, origin, tile_font
        tile_size = BOARD_AREA // n
        board_px = tile_size * n
        ox = (WIDTH - board_px) / 2
        oy = TOP_BAR_H + (HEIGHT - TOP_BAR_H - board_px) / 2
        origin = (ox, oy)
        tile_font = pygame.font.SysFont(None, max(16, int(tile_size * 0.45)))

    def start_game():
        nonlocal board, blank, moves, solved, state
        board = shuffle_board(n)
        blank = board.index(0)
        moves = 0
        solved = False
        layout_board()
        state = PLAYING

    def slide_to_blank(idx):
        """Slide every tile between idx and the blank one step, in one move.

        Clicking a tile that shares a row or column with the blank moves the
        whole run of tiles between them toward the blank, instead of only
        the single tile touching it.
        """
        nonlocal blank, moves, solved
        if idx == blank:
            return
        r, c = divmod(idx, n)
        br, bc = divmod(blank, n)
        if r != br and c != bc:
            return

        pos = blank
        if r == br:
            step = 1 if c > bc else -1
            col = bc
            while col != c:
                col += step
                src = r * n + col
                board[pos] = board[src]
                pos = src
        else:
            step = 1 if r > br else -1
            row = br
            while row != r:
                row += step
                src = row * n + c
                board[pos] = board[src]
                pos = src

        board[idx] = 0
        blank = idx
        moves += 1
        solved = board == solved_board(n)

    def try_move_blank(dr, dc):
        r, c = divmod(blank, n)
        nr, nc = r + dr, c + dc
        if 0 <= nr < n and 0 <= nc < n:
            slide_to_blank(nr * n + nc)

    key_dir = {
        pygame.K_UP: (-1, 0),
        pygame.K_DOWN: (1, 0),
        pygame.K_LEFT: (0, -1),
        pygame.K_RIGHT: (0, 1),
    }

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mx, my = event.pos
                if state == MENU:
                    if minus_btn.contains((mx, my)):
                        n = max(MIN_N, n - 1)
                    elif plus_btn.contains((mx, my)):
                        n = min(MAX_N, n + 1)
                    elif start_btn.contains((mx, my)):
                        start_game()
                else:
                    if menu_btn.contains((mx, my)):
                        state = MENU
                    elif shuffle_btn.contains((mx, my)):
                        start_game()
                    else:
                        ox, oy = origin
                        board_px = tile_size * n
                        if ox <= mx < ox + board_px and oy <= my < oy + board_px and not solved:
                            col = int((mx - ox) // tile_size)
                            row = int((my - oy) // tile_size)
                            slide_to_blank(row * n + col)

            elif event.type == pygame.KEYDOWN:
                if state == MENU:
                    if event.key == pygame.K_LEFT:
                        n = max(MIN_N, n - 1)
                    elif event.key == pygame.K_RIGHT:
                        n = min(MAX_N, n + 1)
                    elif event.key in (pygame.K_RETURN, pygame.K_SPACE):
                        start_game()
                else:
                    if event.key in key_dir and not solved:
                        try_move_blank(*key_dir[event.key])
                    elif event.key == pygame.K_r:
                        start_game()
                    elif event.key in (pygame.K_m, pygame.K_ESCAPE):
                        state = MENU

        screen.fill(BG_COLOR)

        if state == MENU:
            title = title_font.render("Sliding Puzzle", True, TEXT_COLOR)
            screen.blit(title, (WIDTH / 2 - title.get_width() / 2, 90))
            sub = font.render("Choose a grid size, then press Start", True, MUTED_COLOR)
            screen.blit(sub, (WIDTH / 2 - sub.get_width() / 2, 150))

            minus_btn.draw(screen, title_font)
            plus_btn.draw(screen, title_font)
            size_label = title_font.render(f"{n} x {n}", True, TEXT_COLOR)
            screen.blit(size_label, (WIDTH / 2 - size_label.get_width() / 2, 312))

            range_label = small_font.render(
                f"min {MIN_N} x {MIN_N}    max {MAX_N} x {MAX_N} for this screen", True, MUTED_COLOR
            )
            screen.blit(range_label, (WIDTH / 2 - range_label.get_width() / 2, 365))

            start_btn.draw(screen, font)
        else:
            moves_label = font.render(f"Moves: {moves}", True, TEXT_COLOR)
            screen.blit(moves_label, (24, 30))
            hint = small_font.render(
                "Click any tile in the blank's row/column to slide that whole line, or use arrow keys",
                True,
                MUTED_COLOR,
            )
            screen.blit(hint, (24, 58))
            menu_btn.draw(screen, font)
            shuffle_btn.draw(screen, font)

            ox, oy = origin
            for idx, value in enumerate(board):
                if value == 0:
                    continue
                r, c = divmod(idx, n)
                rect = pygame.Rect(ox + c * tile_size, oy + r * tile_size, tile_size, tile_size)
                correct = value == idx + 1
                color = TILE_CORRECT_COLOR if correct else TILE_COLOR
                pygame.draw.rect(screen, color, rect.inflate(-4, -4), border_radius=8)
                pygame.draw.rect(screen, LINE_COLOR, rect.inflate(-4, -4), 2, border_radius=8)
                label = tile_font.render(str(value), True, TEXT_COLOR)
                screen.blit(label, label.get_rect(center=rect.center))

            board_px = tile_size * n
            pygame.draw.rect(screen, LINE_COLOR, (ox, oy, board_px, board_px), 3)

            if solved:
                overlay = pygame.Surface((WIDTH, 90), pygame.SRCALPHA)
                overlay.fill((255, 255, 255, 230))
                screen.blit(overlay, (0, oy + board_px / 2 - 45))
                msg = title_font.render(f"Solved in {moves} moves!", True, TEXT_COLOR)
                screen.blit(msg, (WIDTH / 2 - msg.get_width() / 2, oy + board_px / 2 - 22))

        pygame.display.flip()
        clock.tick(60)
        await asyncio.sleep(0)

    pygame.quit()


if __name__ == "__main__":
    asyncio.run(main())
