Choosing a Product Ready Hack Day Project
=========================================

Up there with the most important questions in life like “What is the meaning of life”
is the question “What do I work on for hack day”. Here at [Rdio][2] we try to have
one hack day (our hack days have been amped up to two days now) per quarter. It is
an opportunity for us to shift our attention to a small project and then pitch
it to our peers. That and we get free pizza.

I always have big aspirations when approaching hack day. This one was no different.
My two projects I was going to pitch:

- Wall of Shame. Each pod of desks at Rdio usually has four people and a TV. The concept behind this
was to use the new Chromecast hardware to cast to that TV what everybody at that desk
is currently listening to you. Allowing you to shame the guy listening to Taylor Swift
as you walk by.

- Eavesdrop. This hack was intended to be built into the people page on mobile
if we ever build that. The idea behind this hack was that you could go to a page and
see all of the people you are following who are online and what they are currently
listening to. When you click on them you would instantly be eavesdropping on their
playback. So every song they listen to would load up on your player.

The problem with these two hacks is that neither one of them would probably make it
into product since they are very specific use cases of the platform. Which is fine, but I
really wanted to make something that we could roll into our product. Queue [Eric Campbell][3].
Eric is one of our amazingly talented designers here at rdio. Eric reached out to me
right before hack day and pitched a redesign of our settings page and adding
profile editing to mobile. Currently our settings page looks like this:

<img src="/media/hack_day/settings.PNG" width=250 height=444/>

Not very attractive and ripe for disruption =]. I agreed and we got to work. Eric whipped
up some flats based on some of our existing UI. I began writing the transaction code between
our mobile app and our backend. After Eric sent me the flats it was go time. I spent the
rest of the time laying out the UI for our new settings screen and adding the UI
for profile editing. I also added the ability to take a profile picture and set it as
your profile image.

After two days of hacking (and some time on the weekend) I was able to put together a fully
functional prototype of this new functionality. Here is the new look.

<div><img src="/media/hack_day/1.png" width=250 height=444/>
<img src="/media/hack_day/2.png" width=250 height=444/></div>

Clicking on the gear icon on the upper right transitions the view to 
profile editing and allows you to do things like set your username,
change your email address and password, etc...

<div><img src="/media/hack_day/3.png" width=250 height=444/>
<img src="/media/hack_day/4.png" width=250 height=444/></div>

Pretty huge improvement. The Monday following our hacks everybody presents what they worked
on. Eric did a great job of showing what we had completed and it went over really well with the group.
Next steps are to get this on the roadmap and finish the feature completely by adding an
Android UI. All in all a pretty successful hack day that will eventually make our product even better.

[2]: http://www.rdio.com/
[3]: http://www.rdio.com/people/ecampbell/
