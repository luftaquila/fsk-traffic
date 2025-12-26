.PHONY: all clean

all:
	openscad -o lid.stl  -D part=\"lid\"    housing.scad && \
	openscad -o base.stl -D part=\"bottom\" housing.scad

clean:
	rm -f lid.stl base.stl
