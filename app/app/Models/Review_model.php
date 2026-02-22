<?php namespace App\Models;

use CodeIgniter\Model;

class Review_model extends Base_model
{
    protected $table         = 'review';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Category';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    
    public function average_rating_by_course($course_id){
        $builder = $this->db->table('review');
        $builder->selectAvg('rating');
        $builder->where('course_id', $course_id);
        $builder->where('rating IS NOT NULL'); // Exclude NULL ratings
        
        $query = $builder->get();
        $result = $query->getRow();
    
        // Return the average rating, or 0 if no rating is found
        $average_rating = $result ? ($result->rating ?? 0) : 0;
        return number_format($average_rating, 2);
    }
    
    
    public function rating_distribution_by_course($course_id) {
        // Initialize an array to store the percentage of each star rating
        $rating_percentages = [
            '5_star' => 0,
            '4_star' => 0,
            '3_star' => 0,
            '2_star' => 0,
            '1_star' => 0
        ];
    
        // Get the total number of reviews for the course
        $builder = $this->db->table('review');
        $builder->select('COUNT(*) as total_reviews');
        $builder->where('course_id', $course_id);
        $builder->where('rating IS NOT NULL'); // Exclude NULL ratings
        $query = $builder->get();
        $result = $query->getRow();
        $total_reviews = $result ? $result->total_reviews : 0;
    
        // If there are no reviews, return 0 for all percentages
        if ($total_reviews == 0) {
            return $rating_percentages;
        }
    
        // Count the number of reviews for each rating (1 to 5 stars)
        $builder->select('rating, COUNT(rating) as rating_count');
        $builder->where('course_id', $course_id);
        $builder->where('rating IS NOT NULL'); // Exclude NULL ratings
        $builder->groupBy('rating');
        $query = $builder->get();
        $rating_data = $query->getResult();
    
        // Calculate the percentage for each rating
        foreach ($rating_data as $row) {
            $rating = intval($row->rating); // Convert to integer for comparison
            $rating_count = $row->rating_count;
    
            switch ($rating) {
                case 5:
                    $rating_percentages['5_star'] = ($rating_count / $total_reviews) * 100;
                    break;
                case 4:
                    $rating_percentages['4_star'] = ($rating_count / $total_reviews) * 100;
                    break;
                case 3:
                    $rating_percentages['3_star'] = ($rating_count / $total_reviews) * 100;
                    break;
                case 2:
                    $rating_percentages['2_star'] = ($rating_count / $total_reviews) * 100;
                    break;
                case 1:
                    $rating_percentages['1_star'] = ($rating_count / $total_reviews) * 100;
                    break;
            }
        }
    
        // Format the percentages to 2 decimal places
        foreach ($rating_percentages as $key => $percentage) {
            $rating_percentages[$key] = round($percentage);
        }
    
        return $rating_percentages;
    }

}
