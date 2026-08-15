---
title: "Two Sorting Algorithms: Bubble Sort And Merge Sort"
description: "Bubble Sort and Merge Sort put a list of numbers in order using two different methods. One method is simple. The other method is faster on large lists."
date: 2026-01-26
tags: ["algorithms"]
---

A sorting algorithm puts a list of numbers in order. This page describes two sorting algorithms: Bubble Sort and Merge Sort.

## Bubble Sort

Bubble Sort compares each pair of neighboring numbers in a list. If the first number is larger than the second number, Bubble Sort swaps them. Bubble Sort repeats this across the whole list. Bubble Sort repeats the whole list multiple times, until no swap happens during a full pass.

Example: the list is [5, 2, 4, 1].
- Compare 5 and 2. Swap. List is now [2, 5, 4, 1].
- Compare 5 and 4. Swap. List is now [2, 4, 5, 1].
- Compare 5 and 1. Swap. List is now [2, 4, 1, 5].
- One pass is complete. The list is not fully sorted yet. Bubble Sort repeats the process.

Bubble Sort is simple to write. Bubble Sort is slow on large lists. If a list has 10 items, Bubble Sort works fast. If a list has 10 million items, Bubble Sort takes a long time.

## Merge Sort

Merge Sort splits a list into 2 halves. Merge Sort sorts each half separately. Merge Sort then combines the 2 sorted halves into 1 sorted list.

To combine 2 sorted halves, Merge Sort looks at the first number of each half. Merge Sort picks the smaller number and adds it to the result. Merge Sort repeats this until both halves are empty.

Merge Sort splits each half into smaller halves before sorting, until each half has 1 number. Merge Sort then combines the halves back together in sorted order.

Merge Sort is faster than Bubble Sort on large lists. Merge Sort requires more code to write than Bubble Sort.

## Why this matters

Every time an app sorts data (a leaderboard, search results, a list of files by date), an algorithm makes this choice: how to sort the data. This choice affects how much time the sort takes and how much memory the sort uses. Bubble Sort and Merge Sort are two different answers to the same problem. Different algorithms trade simplicity for speed.

## Try it

Play [Robozzle](/games/robozzle). Robozzle requires you to write exact, repeated instructions for a robot, the same way a sorting algorithm requires exact, repeated instructions for comparing numbers.
