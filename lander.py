import time
import os

def clear_screen():
    """Clears the terminal screen."""
    os.system('cls' if os.name == 'nt' else 'clear')

def main():
    """Main game loop."""
    altitude = 100.0  # meters
    velocity = -20.0   # m/s (negative is downward)
    fuel = 100.0
    gravity = -9.8   # m/s^2 on the Moon (for a gentler game)
    thrust = 20.0      # m/s^2 of thrust per burn
    time_step = 0.5    # seconds per game tick

    print("--- Shuttle Lander ---")
    print("Land on the pad (-L-) with a velocity less than 5 m/s.")
    print("Enter a number from 0 (no thrust) to 5 (max thrust) each second.")
    input("Press Enter to begin...")

    while altitude > 0:
        clear_screen()

        # Display current status
        print(f"Altitude: {altitude:.2f} m")
        print(f"Velocity: {velocity:.2f} m/s")
        print(f"Fuel:     {fuel:.2f} units")
        print("-" * 20)

        # Draw a simple visual of the descent
        for i in range(20, 0, -1):
            if int(altitude / 5) == i:
                print("       >S<")  # The Shuttle
            else:
                print("")
        print("------ -L- ------") # The Landing Pad

        # Get user input for thrust
        try:
            burn = float(input(f"Thrust (0-5)? > "))
            if burn < 0: burn = 0
            if burn > 5: burn = 5
        except ValueError:
            burn = 0

        # Check for fuel
        if fuel < burn:
            print("OUT OF FUEL!")
            burn = fuel
            fuel = 0
        else:
            fuel -= burn

        # Physics calculation
        acceleration = gravity + (burn * thrust / 5)
        velocity += acceleration * time_step
        altitude += velocity * time_step

        time.sleep(time_step)

    # Landing results
    clear_screen()
    print("--- LANDING REPORT ---")
    if abs(velocity) < 5:
        print("Congratulations! A safe landing.")
    else:
        print(f"CRASH! Final velocity was {velocity:.2f} m/s. Too fast!")
    print("--------------------")

if __name__ == "__main__":
    main()
