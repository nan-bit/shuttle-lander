import curses
import time

def main(stdscr):
    """Main game loop using curses."""
    # Curses setup
    curses.curs_set(0)
    stdscr.keypad(True)

    # Color setup
    curses.start_color()
    curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)
    curses.init_pair(2, curses.COLOR_YELLOW, curses.COLOR_BLACK)
    LZ_COLOR = curses.color_pair(1)
    SCORE_COLOR = curses.color_pair(2)

    high_score = 0

    while True: # Main game loop for replayability
        # Game state (reset for each new game)
        altitude = 100.0
        velocity_y = -10.0
        position_x = 75.0
        velocity_x = -5.0
        fuel = 200.0
        gravity = -8.0
        thrust_power = 15.0
        side_thrust_power = 3.0
        vertical_thrust = 0.0
        horizontal_thrust = 0.0

        height, width = stdscr.getmaxyx()
        stdscr.nodelay(1)
        stdscr.timeout(500) # Slowed down game speed

        while altitude > 0:
            stdscr.clear()

            # --- Display Stats ---
            stats = (
                f"Alt: {altitude:6.2f}m | Y-Vel: {velocity_y:6.2f}m/s | X-Vel: {velocity_x:6.2f}m/s | "
                f"Fuel: {fuel:6.2f} | V-Thrust: {vertical_thrust:1.0f} | H-Thrust: {horizontal_thrust:2.0f}"
            )
            score_info = f"High Score: {high_score:.0f}"
            stdscr.addstr(0, 1, score_info, SCORE_COLOR)
            stdscr.addstr(1, (width - len(stats)) // 2, stats)

            # --- Draw Game World ---
            shuttle_x = int((position_x / 100.0) * width)
            shuttle_y = int(height - (altitude / 100.0) * (height - 4))
            stdscr.addstr(shuttle_y, shuttle_x - 3, ">S<")

            pad_center_x = width // 2
            pad_width = 16
            pad_start_x = pad_center_x - (pad_width // 2)
            stdscr.addstr(height - 2, pad_start_x, "------ ")
            stdscr.addstr(height - 2, pad_start_x + 7, "-L-", LZ_COLOR)
            stdscr.addstr(height - 2, pad_start_x + 10, " ------")

            # --- Handle Input ---
            key = stdscr.getch()
            horizontal_thrust = 0

            if key != -1:
                if key == curses.KEY_UP:
                    vertical_thrust = min(5, vertical_thrust + 1)
                elif key == curses.KEY_DOWN:
                    vertical_thrust = max(0, vertical_thrust - 1)
                elif key == curses.KEY_LEFT:
                    horizontal_thrust = -1.0
                elif key == curses.KEY_RIGHT:
                    horizontal_thrust = 1.0
                elif key == ord('q'):
                    return

            # --- Physics Update ---
            total_thrust_fuel = vertical_thrust + abs(horizontal_thrust)
            if fuel > 0:
                burn = min(total_thrust_fuel, fuel)
                fuel -= burn
                v_burn_ratio = (vertical_thrust / total_thrust_fuel) if total_thrust_fuel > 0 else 0
                h_burn_ratio = (abs(horizontal_thrust) / total_thrust_fuel) if total_thrust_fuel > 0 else 0
                v_thrust_adj = burn * v_burn_ratio
                h_thrust_adj = burn * h_burn_ratio * (-1 if horizontal_thrust < 0 else 1)
            else:
                v_thrust_adj = 0
                h_thrust_adj = 0

            acceleration_y = gravity + (v_thrust_adj * thrust_power / 5)
            velocity_y += acceleration_y * 0.5 # Time step is now 0.5s
            altitude += velocity_y * 0.5

            acceleration_x = (h_thrust_adj * side_thrust_power)
            velocity_x += acceleration_x * 0.5
            position_x += velocity_x * 0.5

            if not 0 < position_x < 100:
                position_x = max(0, min(100, position_x))
                velocity_x = 0

            stdscr.refresh()

        # --- Landing Report ---
        stdscr.clear()
        stdscr.nodelay(0)
        report_y = height // 2
        
        pad_start_percent = (pad_center_x - (pad_width // 2)) / width * 100
        pad_end_percent = (pad_center_x + (pad_width // 2)) / width * 100

        on_pad = pad_start_percent <= position_x <= pad_end_percent
        safe_speed = abs(velocity_y) < 5 and abs(velocity_x) < 2
        score = 0

        if on_pad and safe_speed:
            score = fuel
            if score > high_score:
                high_score = score
            msg = f"Safe landing! Your score: {score:.0f}"
        elif on_pad and not safe_speed:
            msg = f"CRASH! Hit the pad too hard. V-Vel: {velocity_y:.2f}, H-Vel: {velocity_x:.2f}"
        else:
            msg = "CRASH! You missed the landing pad."

        stdscr.addstr(report_y - 2, (width - len(msg)) // 2, msg)
        score_msg = f"High Score: {high_score:.0f}"
        stdscr.addstr(report_y, (width - len(score_msg)) // 2, score_msg, SCORE_COLOR)
        stdscr.addstr(report_y + 2, (width - 25) // 2, "Play Again? (y/n)")
        
        key = stdscr.getch()
        if key != ord('y'):
            break

if __name__ == "__main__":
    try:
        curses.wrapper(main)
    except curses.error as e:
        print(f"Error running curses: {e}")
        print("Your terminal might not support curses, or the window is too small.")