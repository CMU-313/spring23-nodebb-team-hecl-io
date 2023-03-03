User Guide
--------

Detailed outline of how to use and user test our new feature(s):

--------

### Feature 1: Topics Resolve/Unresolve

#### How to Use:

* Register for and use an admin account in NodeBB (feature is meant for admins only)
* To resolve or unresolve from a topic, click the settings button to access the topic tool dropdown. From there, you’ll see a resolve/unresolve button with an icon. Click this button. Notice, the resolved status is updated accordingly with color and an icon next to the topic’s name.
* To resolve or unresolve from a category view (in bulk), click the profile pictures of topics to select them. Then in the topic tools dropdown on the top right, select the resolve or unresolve option to bulk resolve or unresolve the selected topics.
* View the screenshots below for a visual of this feature. 


#### Automated Testing:
* Automated tests location: test/topics.js
* Link to automated tests: https://github.com/CMU-313/spring23-nodebb-team-hecl-io/commit/d5170df0ae3cc15f950a2c53a333355556e61fd3

* Description: The automated testing for the feature is divided into two parts: resolve and unresolve. For each, there is an automated test that pings the post/topics API and attempts to mark a topic as either resolved or unresolved respectively. To ensure the topic was correctly marked, each test uses an assert statement to verify the topic's resolved/unresolved status. 

#### Screenshots:
![unresolvedBanner](https://user-images.githubusercontent.com/66187015/222623278-fe0d8266-4f80-4762-a5e4-5b5247b45777.png)
![unresolveButton](https://user-images.githubusercontent.com/66187015/222623289-a36ee4a5-09b7-4742-8ee5-2c62c6e085fe.png)
![resolveButton](https://user-images.githubusercontent.com/66187015/222623299-733ffc20-897f-462b-bca0-5f09258d3987.png)




--------

### Feature 2: Posts Endorse/Unendorse

#### How to use:
* Login to NodeBB
* Navigate to a post that you would like to endorse or unendorse. 
* Notice the "endorse" or "unendorse" button at the bottom right of the post view. Note, it is next to the reply button. 
* To endorse or unendorse a post, click this button to toggle the post's endorsed status. 
* If endorsed, the post will display the following message in green text at the center of the post: "This post has been marked as endorsed".
* View the screenshots below for a visual of this feature. 

#### Automated Testing:
* Location: test/posts.js
* Link: https://github.com/CMU-313/spring23-nodebb-team-hecl-io/commit/f22075f42c1faa232b297b5cc077e82a163e70ce

* Description: The automated testing for the feature is divided into two parts: endorse and unendorse. For each, there is an automated test that pings the post/topics API and attempts to mark a topic as either endorsed or unendorsed respectively. To ensure the topic was correctly marked, each test uses an assert statement to verify the topic's endorsed/unendorsed status. 

#### Screenshots:
![endorseButton](https://user-images.githubusercontent.com/66187015/222623575-e010e9a3-a6d0-4642-94fb-f4c08e22a6c0.png)
![endorseBanner_unendorseButton](https://user-images.githubusercontent.com/66187015/222623590-3d8b4434-595a-4444-90f3-b4261917a78d.png)

