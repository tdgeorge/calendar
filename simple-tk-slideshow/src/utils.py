def load_images_from_directory(directory):
    import os
    from PIL import Image

    valid_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.bmp')
    images = []

    for filename in os.listdir(directory):
        if filename.lower().endswith(valid_extensions):
            image_path = os.path.join(directory, filename)
            images.append(Image.open(image_path))

    return images

def randomize_image_order(images):
    import random
    random.shuffle(images)
    return images

def validate_directory(directory):
    import os
    return os.path.isdir(directory) and os.listdir(directory) != []