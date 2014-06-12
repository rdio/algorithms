Visual Shazam Hack - June 2014
===============================

Currently, [Rdio users can connect with Shazam](http://blog.rdio.com/us/2014/03/rdio-shazam-now-with-more-power.html) to identify audio and link these matched tracks for easy playback in the Rdio app. Similarily, it would be useful to incorporate the ability to identify and play tracks based on a visual reference, an album cover. For Rdio's June hack day, I developed a way for users to take a photo of an album cover and play the corresponding Rdio album based on the captured image, like a visual Shazam. This functionality will be helpful whether a user is at a record store, is reading through the most recent copy of Billboard magazine, or eyes an interesting concert poster on the street, and wants to listen to the album or artist on the spot.  

<h3>How it Works</h3>  

The user takes a picture of the album cover. This photo is matched to an existing album image in Rdio's database of album artwork using feature detection and matching. This hack was built using the [OpenCV](http://opencv.org/) library, which utilizes the [ORB (Oriented FAST and Rotated BRIEF)](http://www.vision.cs.chubu.ac.jp/CV-R/pdf/Rublee_iccv2011.pdf) technique [1]. ORB detects key points by identifying corners and determining their orientation; it is both rotation invariant and resistant to noise. Once key point vectors in both the photo and each cataloged album image are identified, a brute force match is used to find the best matches in the each photo-album artwork image pair. [Lowe's ratio test](http://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf) [2] is then applied to the match pairs, which discards a high percentage of the false matches. This test is applied to each feature and finds the ratio between the best and second-best matches. Points are eliminated if the resulting ratio is below a specified threshold, in this case 0.7. The cataloged album image with the highest number of remaining match pairs (with the photo) is determined to be the best match.  

As illustrated below, a photo that more closely resembles the cataloged image will have more matched key points, regardless of rotation or excess information. In each image set, the cataloged album artwork image is on the left and the user's uploaded photo from a magazine is on the right.  

<img src="/media/allison_deal_hack_day_june_2014/sve_example.png"></img>  
<em>[Above] Comparing feature points of a cataloged album artwork image of Sharon Van Etten: Are We There with a photograph of the same album cover.</em>  

<img src="/media/allison_deal_hack_day_june_2014/sve_beach_boys_example.png"></img>  
<em>[Above] Comparing feature points of a cataloged album artwork image of The Beach Boys: Pet Sounds with a photograph of the album Sharon Van Etten: Are We There.</em>  

Once the photo is best matched to a specific image in the Rdio album artwork database, the Rdio Album ID of the best matching image is used play the album.  

<h3>Future Hacking</h3> 

This hack currently uses a small set of album artwork images to compare photos against. A next step is to use the entire Rdio image catalog and implement an efficient way to compare the photo with only the most similar of these stored images. Additionally, photos taken from a mobile device are currently manually uploaded for comparison; another improvement is to incorporate this functionality directly into the Rdio mobile app. I look forward to scaling out the project and implementing the mobile portion during the next Rdio hack day!

[1] E. Rublee, V. Rabaud, K. Konolidge, and G. Bradski. ORB: An Efﬁcient Alternative to SIFT or SURF. In ICCV’11. [http://www.vision.cs.chubu.ac.jp/CV-R/pdf/Rublee_iccv2011.pdf](http://www.vision.cs.chubu.ac.jp/CV-R/pdf/Rublee_iccv2011.pdf)  
[2] Distinctive image features from scale-invariant key points. David 
G. Lowe, International Journal of Computer Vision, 60, 2 (2004), pp. 91-110. [http://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf](http://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf) 
