<?php namespace App\Models;

use CodeIgniter\Model;

class Category_model extends Base_model
{
    protected $table         = 'category';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Category';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    
    public function category_data($categories){
        $categorydata = [
            'id' => $categories['id'] ?? '',
            'code' => $categories['code'] ?? '',
            'name' => $categories['name'] ?? '',
            'parent' => $categories['parent'] ?? '',
            'slug' => $categories['slug'] ?? '',
            'description' => $categories['description'] ?? '',
            'short_description' => $categories['short_description'] ?? '',
            'video_type' => $categories['video_type'] ?? '',
            'video_url' => $categories['video_url'] ?? '',
            'font_awesome_class' =>  $categories['font_awesome_class'] ?? '',
            'thumbnail' => valid_file($categories['thumbnail']) ? base_url(get_file($categories['thumbnail'])) : '',
        ];
        return $categorydata;
    }

}
