<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Payments_model;

class Package_model extends Base_model
{
    protected $table         = 'package';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Package';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];


    public function package_data($package, $userdata) {
        $this->payments_model = new Payments_model();
        
        $is_purchased = $this->payments_model->get(['package_id' => $package['id'], 'user_id' => $userdata->id])->getNumRows();
        
        $amount = $package['amount'] - $package['discount'];
        
        $actual_amount = ($package['discount'] == 0) ? $package['amount'] : $amount;
        
        $discount = ($package['discount'] / $package['amount']) * 100;
        
        if ($package['amount'] == $actual_amount) {
            $package['amount'] = '';
        }
        
        // Initialize an empty array to store the result
        $description = [];
        
        // Use regular expressions to extract the content between <li> and </li>
        preg_match_all('/<li>(.*?)<\/li>/', $package['description'], $matches_li);
        foreach ($matches_li[1] as $item) {
            $description[] = cleanHTMLText($item); // Add each matched item as an array element
        }
    
        // Extract content between <p> and </p>
        preg_match_all('/<p>(.*?)<\/p>/', $package['description'], $matches_p);
        foreach ($matches_p[1] as $item) {
            $description[] = cleanHTMLText($item); // Add each matched item as an array element
        }
        
        $packagedata = [
            'id' => $package['id'] ?? '',
            'is_purchased' => $package['type'] != 2 ? (($is_purchased > 0) ? 1 : 0) : 0,
            'title' => $package['title'] ?? '',
            'type' => $package['type'] ?? '',
            'category_id' => $package['category_id'] ?? '',
            'course_id' => $package['course_id'] ?? '',
            'actual_amount' => $package['amount'] ?? '',
            'discount_percentage' => round($discount) ?? '',
            'best_value' => $package['id'] == 1 ? 1 : 0,
            'price_text' => '',
            'payable_amount' => $actual_amount,
            'is_free' => $package['is_free'] ?? '',
            'package_type' => $package['package_type'] ?? '',
            'remarks' => $package['remarks'] ?? '',
            'offline' => $package['offline'] ?? '',
            'features' => $description,
            'start_date' => $package['start_date'] ?? '',
            'end_date' => $package['end_date'] ?? '',
            'duration' => $duration ?? '',
            'name' => $userdata->name,
            'phone' => $userdata->email,
            'email' => $userdata->user_email ?? '',
            'razorpay_api_key' => get_settings('razorpay_api_key'),
            'razorpay_api_secret_key' => get_settings('razorpay_api_secret_key'),
        ];
        
        return $packagedata;
    }

}
