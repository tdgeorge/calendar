import os
import random
import time
import tkinter as tk
from tkinter import filedialog
from PIL import Image, ImageTk

class SlideshowApp:
    def __init__(self, master):
        self.master = master
        self.master.title("Image Slideshow")
        
        self.directory = ""
        self.interval = 1.0
        
        self.create_widgets()

    def create_widgets(self):
        self.dir_button = tk.Button(self.master, text="Select Directory", command=self.select_directory)
        self.dir_button.pack(pady=10)

        self.slider = tk.Scale(self.master, from_=0.1, to=10, resolution=0.1, orient=tk.HORIZONTAL, label="Slideshow Interval (seconds)")
        self.slider.set(1.0)
        self.slider.pack(pady=10)

        self.start_button = tk.Button(self.master, text="Start Slideshow", command=self.start_slideshow)
        self.start_button.pack(pady=10)

    def select_directory(self):
        self.directory = filedialog.askdirectory()
        if self.directory:
            print(f"Selected directory: {self.directory}")

    def start_slideshow(self):
        self.interval = self.slider.get()
        self.images = self.load_images(self.directory)
        if self.images:
            self.show_fullscreen_slideshow()

    def load_images(self, directory):
        valid_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.bmp')
        images = [os.path.join(directory, f) for f in os.listdir(directory) if f.lower().endswith(valid_extensions)]
        random.shuffle(images)
        return images

    def show_fullscreen_slideshow(self):
        self.fullscreen_window = tk.Toplevel(self.master)
        self.fullscreen_window.attributes("-fullscreen", True)
        self.fullscreen_window.bind("<Escape>", self.close_slideshow)

        self.image_label = tk.Label(self.fullscreen_window)
        self.image_label.pack(expand=True)

        self.current_image_index = 0
        self.display_next_image()

    def display_next_image(self):
        if self.current_image_index < len(self.images):
            image_path = self.images[self.current_image_index]
            image = Image.open(image_path)
            image = image.resize((self.fullscreen_window.winfo_width(), self.fullscreen_window.winfo_height()), Image.ANTIALIAS)
            self.photo = ImageTk.PhotoImage(image)
            self.image_label.config(image=self.photo)
            self.image_label.image = self.photo
            
            self.current_image_index += 1
            self.fullscreen_window.after(int(self.interval * 1000), self.display_next_image)
        else:
            self.current_image_index = 0
            self.display_next_image()

    def close_slideshow(self, event):
        self.fullscreen_window.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = SlideshowApp(root)
    root.mainloop()