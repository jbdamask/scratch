package main

import (
	"fmt"
	"image"
	_ "image/png"
	"os"

	"github.com/charmbracelet/lipgloss"
	"github.com/lucasb-eyer/go-colorful"
    "github.com/muesli/termenv"
)

func main() {
    // Force TrueColor
    lipgloss.SetColorProfile(termenv.TrueColor)

	f, err := os.Open("/Users/johndamask/Downloads/ghost-pipefish-1.png")
	if err != nil {
		panic(err)
	}
	defer f.Close()

	img, _, err := image.Decode(f)
	if err != nil {
		panic(err)
	}

	// Smaller size
    width := 16
    height := 8
    
    scaleX := img.Bounds().Dx() / width
    scaleY := img.Bounds().Dy() / height

    fmt.Println("package ui")
    fmt.Println("")
    // Use backticks for raw string, but since ANSI codes might contain things that confuse Go raw strings (unlikely but possible),
    // effectively we are just dumping the string.
    fmt.Println("const Logo = `")
    
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
            px := x * scaleX + scaleX/2
            py := y * scaleY + scaleY/2
            
            c := img.At(px, py)
            r, g, b, a := c.RGBA()
            
            if a == 0 {
                fmt.Print("  ") // Transparent (2 spaces for aspect ratio)
                continue
            }
            
            col := colorful.Color{R: float64(r)/65535.0, G: float64(g)/65535.0, B: float64(b)/65535.0}
            
            // Using "  " (two spaces) with background color is often better for pixel art in terminal
            // but let's try foreground "██"
            style := lipgloss.NewStyle().Foreground(lipgloss.Color(col.Hex())).SetString("██")
            fmt.Print(style.String())
		}
        fmt.Println("")
	}
    fmt.Println("`")
}
