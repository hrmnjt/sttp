---
id: nlpwAR5RhEqc2zdtXp4L2
title: Functions
desc: ''
updated: 1642143702708
created: 1641734880712
---

## Functions

#todo



## From tour - Named return values

Link: https://go.dev/tour/basics/7

> A return statement without arguments returns the named return values. This is known as a "naked" return.

> Naked return statements should be used only in short functions, as with the example shown here. They can harm readability in longer functions.

```go
package main

import "fmt"

func split(sum int) (x, y int) {
	x = sum * 4 / 9
	y = sum - x
	return
}

func main() {
	fmt.Println(split(17))
}
```

```bash
7 10
```


## Funky stuff - Named results with non-naked return

Extending above example

### Case 1: `return` args are same as function result
```go
func split(sum int) (x, y int) {
	x = sum * 4 / 9
	y = sum - x
	return x, y
}
```
returns
```bash
7 10
```

### Case 2: `return` args are jumbled 

`return` trumps the function definition order - *do not try this at home*

```go
func split(sum int) (x, y int) {
	x = sum * 4 / 9
	y = sum - x
	return y, x
}
```
returns
```bash
10 7
```

### Case 3: `return` repeats args

```go
func split(sum int) (x, y int) {
	x = sum * 4 / 9
	y = sum - x
	return x, x
}
```
returns
```bash
7 7
```
- doesn't throw error that y is never returned
- doesn't care about function definition and returns as per the `return` arg definition

### Case 4: `return` has more or less args

```go
func split(sum int) (x, y int) {
	x = sum * 4 / 9
	y = sum - x
	return x, x, x
}
```
returns
```bash
# example
./prog.go:8:2: too many arguments to return
	have (int, int, int)
	want (int, int)
```
