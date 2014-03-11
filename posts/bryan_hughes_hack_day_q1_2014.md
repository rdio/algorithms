Cluster Hack Day Project - February 2014!
=========================================

For Rdio's quarterly hack day, I decided to focus on the visualization of similarity between people. It's easy to compare two people and show how similar they are. You can show a similarity score, you can show the actual artists their collections have in common, or you could even have some fun graphics that represent similarity such as a traffic light. But what about three people? ten people? a hundred?

With multiple people, the most obvious choice is place them on a 2D plane, with similar people being close to each other and dissimilar people being far apart. This is actually a hard problem to solve, as it turns out. In Computer Science theory, this is known as an NP-hard problem, which means that if we got all of the computers in the world to work on this problem, it would still take millions of years to solve for anything more than a couple of people.

Fortunately, approximations exist that can solve the problem reasonably well in a reasonable amount of time. Their placement isn't perfect, but it's usually good enough.

So how does it work? We start of with a matrix the similarities between all of the people. In this matrix, 0 means completely similar and 1 means completely dissimilar.

   | A    | B    | C    | D    | E    | F    | G    | H    | I    | J
:-:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:
 A | 0.00 | 0.18 | 0.35 | 0.53 | 0.18 | 0.25 | 0.40 | 0.56 | 0.35 | 0.40
 B | 0.18 | 0.00 | 0.18 | 0.35 | 0.25 | 0.18 | 0.25 | 0.40 | 0.40 | 0.35
 C | 0.35 | 0.18 | 0.00 | 0.18 | 0.40 | 0.25 | 0.18 | 0.25 | 0.50 | 0.40
 D | 0.53 | 0.35 | 0.18 | 0.00 | 0.56 | 0.40 | 0.25 | 0.18 | 0.64 | 0.50
 E | 0.18 | 0.25 | 0.40 | 0.56 | 0.00 | 0.18 | 0.35 | 0.53 | 0.18 | 0.25
 F | 0.25 | 0.18 | 0.25 | 0.40 | 0.18 | 0.00 | 0.18 | 0.35 | 0.25 | 0.18
 G | 0.40 | 0.25 | 0.18 | 0.25 | 0.35 | 0.18 | 0.00 | 0.18 | 0.40 | 0.25
 H | 0.56 | 0.40 | 0.25 | 0.18 | 0.53 | 0.35 | 0.18 | 0.00 | 0.56 | 0.40
 I | 0.35 | 0.40 | 0.50 | 0.64 | 0.18 | 0.25 | 0.40 | 0.56 | 0.00 | 0.18
 J | 0.40 | 0.35 | 0.40 | 0.50 | 0.25 | 0.18 | 0.25 | 0.40 | 0.18 | 0.00

For my hack day project, I calculated these values by creating a station for each follower a person has, counting the number of similar artists each user had in their station, and normalized the values to be between 0 and 1. The algorithm is generic enough that it could be used for any set of normalized similarity data.

So how do we take this data, which has no location information, and determine a location? I use a technique called multilevel graph partitioning to create a quad tree. With graph partitioning, you take a set of data and split it into groups. You then take those groups and split them into groups, and so on until each group contains 0 or 1 entries. This decomposition forms a natural tree structure:

<img src="/media/bryan_hughes_hack_day_q1_2014/tree.png"></img>

The graph partitions are calculated using Recursive Level-Structure Quadrisection, an extension of [Recursive Level-Structure Bisection](http://homes.cs.washington.edu/~bradc/cv/pubs/degree/generals.html) to 2 dimensions [1]. This algorithm starts by find the four points that are furthest apart from each other. We can think of these points as the four "corners" of the graph. Then we take the rest of the points and evenly sort them into four partitions by determining which of the four points this point is closest too.

Once we have the tree, we assign each branch to a quadrant: branch 1 goes to quadrant I, branch 2 to quadrant II, etc, which gives us the following:

<img src="/media/bryan_hughes_hack_day_q1_2014/grid1.png"></img>

The output of this algorithm is pretty rough and not really usable outright. This happens for two reasons. The first is because we assign each branch in the tree to a quadrant without any regard for appropriateness of the quadrant. The second reason is because the partitioning algorithm we use is a _local_ graph partitioning algorithm. Local partitioning algorithms only look at the current partition when determining where to place elements. If two elements are pretty close to each other, but in neighboring partitions, they can end up on the opposite ends of the grid, as is the case with H and J.

To get around this limitation, two graph refinement algorithms are used that are both loosely based on the [Kernighan–Lin refinement algorithm](http://en.wikipedia.org/wiki/Kernighan%E2%80%93Lin_algorithm) [2]. The gist of Kernighan–Lin is that each node inside of a partition is swapped with all the nodes outside of the partition to see if the global accuracy is increased. If so, the swap is kept, otherwise it is reversed.

The first algorithm retraces the the original partitions made and performs KL on them, but instead of swapping individual elements, it swaps entire quadrants. This algorithm corrects for the first limitation where quadrants are randomly assigned. The second algorithm uses a moving "window" for a partition that is fixed at 2x2 and is moved in increments of 1 across the entire grid. This helps with the second problem because it doesn't work on the boundaries that were used in the initial partitioning. The results of these two algorithms gives us more realistic results:

<img src="/media/bryan_hughes_hack_day_q1_2014/grid2.png"></img>

It's still not perfect, but works pretty well for a first attempt. The final result, working on a small set of real data, looks like this:

<img src="/media/bryan_hughes_hack_day_q1_2014/result.png"></img>

[1] Chamberlain, Bradford L. "Graph Partitioning Algorithms for Distributing Workloads of Parallel Computations," Oct. 1998. University of Washington. [http://homes.cs.washington.edu/~bradc/cv/pubs/degree/generals.html](http://homes.cs.washington.edu/~bradc/cv/pubs/degree/generals.html)

[2] "Kernighan-Lin algorithm." Wikipedia. [http://en.wikipedia.org/wiki/Kernighan%E2%80%93Lin_algorithm](http://en.wikipedia.org/wiki/Kernighan%E2%80%93Lin_algorithm)
