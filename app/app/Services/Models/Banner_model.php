<?php namespace App\Models;

use CodeIgniter\Model;

class Banner_model extends Base_model
{
    protected $table         = 'banners';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Category';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    public function get_banner(){
        $banners = $this->get([],['id', 'title', 'image'])->getResultArray();
        foreach($banners as $key => $banner){
            $banners[$key]['image'] = valid_file($banner['image']) ? base_url(get_file($banner['image'])) : '';
        }
        return $banners;
    }

}
