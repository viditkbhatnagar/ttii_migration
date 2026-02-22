<?php
//File: app/Controllers/Api/Home.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Feed_model;
use App\Models\Feed_watched_model;
use App\Models\Feed_like_model;
use App\Models\Feed_comments_model;
use App\Models\Stories_model;
use App\Models\Users_model;

class Feed extends Api
{
    private $users_model;
    public function __construct(){
        $this->feed_model = new Feed_model();
        $this->feed_watched_model = new Feed_watched_model();
        $this->feed_like_model = new Feed_like_model();
        $this->feed_comments_model = new Feed_comments_model();
        $this->stories_model = new Stories_model();
        $this->users_model = new Users_model();
    }
    
    /*** Feed List ***/
    public function index()
    {
        $this->is_valid_request(['GET']);
        $userdata =$this->users_model->get(['id' => $this->user_id])->getRow();
        
     
        $feeds = $this->feed_model->get(['course_id' => [$userdata->course_id, 0]],['id','title','content','feed_category_id','course_id','image','created_at as date','instructor_id'])->getResultArray();
        foreach($feeds as $key=> $photo)
        {
            $instructor = $this->users_model->get(['id' =>$photo['instructor_id']],['id','name','image'])->getRowArray();
            
            $feeds[$key]['instructor_name'] = $instructor['name'];
             $feeds[$key]['instructor_image'] = valid_file($instructor['image']) ? base_url(get_file($instructor['image'])) : base_url('uploads/dummy.jpg');

            $feeds[$key]['image']    =  valid_file($photo['image']) ? base_url(get_file($photo['image'])) : '';
            $feeds[$key]['is_liked'] =  $this->feed_like_model->get(['feed_id' => $photo['id'], 'user_id' => $this->user_id])->getNumRows()>0 ? 1 : 0;;
            $feeds[$key]['likes']    =  $this->feed_like_model->get(['feed_id' => $photo['id']])->getNumRows();
            $feeds[$key]['date']    =  date('d-m-Y', strtotime($photo['date']));
        }
        
        $data = [
            'feed'  => $feeds,
        ];
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $data];
        return $this->set_response();
    }
    
    /*** Feed Watched Status Store ***/
    public function feed_watched(){
        $this->is_valid_request(['GET']);
        $feed_id = $this->request->getGet('feed_id');
        $watched = $this->feed_watched_model->get(['feed_id' => $feed_id, 'user_id' => $this->user_id])->getNumRows();
        if($watched==0){
            $data['feed_id']  = $feed_id;
            $data['user_id']    = $this->user_id;
            $data['created_by'] = $this->user_id;
            $data['created_at'] = date('Y-m-d H:i:s');
            $this->feed_watched_model->add($data);
        }
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        return $this->set_response();
    }
    
    /*** Feed Liked Status Store ***/
    public function feed_like(){
        $this->is_valid_request(['GET']);
        $feed_id = $this->request->getGet('feed_id');
        $liked = $this->feed_like_model->get(['feed_id' => $feed_id, 'user_id' => $this->user_id])->getNumRows();
        if($liked > 0){
            $this->feed_like_model->remove(['feed_id' => $feed_id, 'user_id' => $this->user_id]);
        }else{
            $data['feed_id']  = $feed_id;
            $data['user_id']    = $this->user_id;
            $data['created_by'] = $this->user_id;
            $data['created_at'] = date('Y-m-d H:i:s');

            $this->feed_like_model->add($data);
        }
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        return $this->set_response();
    }

    /*** Feed Comment Add ***/
    public function add_feed_comment(){
        $this->is_valid_request(['GET']);
        $feed_id = $this->request->getGet('feed_id');
        $comment = $this->request->getGet('comment');

        $data['user_id']    = $this->user_id;
        $data['feed_id']  = $feed_id;
        $data['comment']  = $comment;
        $data['created_by'] = $this->user_id;
        $data['created_at'] = date('Y-m-d H:i:s');
        $this->feed_comments_model->add($data);
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => []];
        return $this->set_response();
    }
    
    /*** Feed Comments ***/
    public function feed_comments(){
        $this->is_valid_request(['GET']);
        $feed_id = $this->request->getGet('feed_id');
        $feed_comments = $this->feed_comments_model->get_join([['users','users.id = feed_comments.user_id','left'],['feed','feed.id = feed_comments.feed_id','left']], 
                            ['feed_comments.feed_id' => $feed_id],
                            ['feed_comments.feed_id', 'feed.title as feed_title', 'feed.content', 'feed_comments.id comment_id', 'feed_comments.comment', 'feed_comments.created_at as date',  'feed_comments.user_id','users.name as user_name', 'users.image as profile']
                        )->getResultArray();
        
        foreach($feed_comments as $key=> $feed_comment){
            $feed_comments[$key]['date'] = date('d-m-Y', strtotime($feed_comment['date']));
            $feed_comments[$key]['profile'] = valid_file($feed_comment['profile']) ? base_url(get_file($feed_comment['profile'])) : '';
        }
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $feed_comments];
        return $this->set_response();
    }

}
