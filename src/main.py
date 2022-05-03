from pathlib import Path
import mistletoe

p = Path('blog')
for post in list(p.glob('**/*.md')):
    with open(post, 'r') as fin:
        print(mistletoe.markdown(fin))
        print('------------------------')

# TODO: convert blog1.md, blog2.md to HTML
# TODO: add an option to print title and description and other metadata
# TODO: add templates
# TODO: add <head>, <header> and <footer> tags
# TODO: styling and css
# TODO: make/just files
# TODO: unit test
# TODO: github workflow
