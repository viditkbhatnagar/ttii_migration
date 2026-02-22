<?php
namespace App\Controllers\Shared;

use App\Models\Leave_type_model ; 
use App\Models\Users_model ; 
use App\Models\Leave_request_model ;

use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\Response;
class Slack extends SharedController
{
    
    private $leave_type_model;
    private $users_model;
    private $leave_request_model;
    public function __construct()
    {
        parent::__construct();
        $this->leave_type_model = new Leave_type_model();
        $this->users_model = new Users_model();
        $this->leave_request_model = new Leave_request_model();
        
        
        
    }

    
    
    public function leave_application_form(){
        header('Content-Type: application/json; charset=utf-8');
        
        if ($_SERVER['REQUEST_METHOD'] == 'POST') {
            
            $trigger_id = $_POST['trigger_id']; // Get the trigger ID from Slack's request
            
            $leave_types = $this->leave_type_model->get()->getResultArray();
            $options = [];
            foreach ($leave_types as $leave_type) {
                $options[] = [
                    "text" => [
                        "type" => "plain_text",
                        "text" => $leave_type["title"],
                        "emoji" => true,
                    ],
                    "value" => $leave_type["id"], // Assuming title is unique and suitable as value
                ];
            }
            
            $modalData = [
                "type" => "modal",
                "submit" => [
                    "type" => "plain_text",
                    "text" => "Submit",
                    "emoji" => true,
                ],
                "close" => [
                    "type" => "plain_text",
                    "text" => "Cancel",
                    "emoji" => true,
                ],
                "title" => [
                    "type" => "plain_text",
                    "text" => "Absence Request",
                    "emoji" => true,
                ],
                "blocks" => [
                    [
                        "type" => "section",
                        "text" => [
                            "type" => "plain_text",
                            "text" => "Please provide details for your absence.",
                            "emoji" => true,
                        ],
                    ],
                    [
                        "type" => "divider",
                    ],
                    [
                        "type" => "input",
                        "label" => [
                            "type" => "plain_text",
                            "text" => "Absence Type   ",
                            "emoji" => true,
                        ],
                        "element" => [
                            "type" => "static_select",
                            "placeholder" => [
                                "type" => "plain_text",
                                "text" => "Select Absence Type",
                                "emoji" => true,
                            ],
                            "options" => $options, // Dynamic options
                        ],
                        "block_id" => "absence_type_block",
                    ],
                    [
                        "type" => "input",
                        "label" => [
                            "type" => "plain_text",
                            "text" => "Absence Details   ",
                            "emoji" => true,
                        ],
                        "element" => [
                            "type" => "plain_text_input",
                            "multiline" => true,
                        ],
                        "block_id" => "absence_details_block",
                    ],
                    [
                        "type" => "input",
                        "label" => [
                            "type" => "plain_text",
                            "text" => "From Date   ",
                            "emoji" => true,
                        ],
                        "element" => [
                            "type" => "datepicker",
                            "placeholder" => [
                                "type" => "plain_text",
                                "text" => "Select a date",
                                "emoji" => true,
                            ],
                            "action_id" => "from_date",
                        ],
                    ],
                    [
                        "type" => "input",
                        "label" => [
                            "type" => "plain_text",
                            "text" => "To Date   ",
                            "emoji" => true,
                        ],
                        "element" => [
                            "type" => "datepicker",
                            "placeholder" => [
                                "type" => "plain_text",
                                "text" => "Select a date",
                                "emoji" => true,
                            ],
                            "action_id" => "to_date",
                        ],
                    ],
                    [
                        "type" => "input",
                        "label" => [
                            "type" => "plain_text",
                            "text" => "From Time   ",
                            "emoji" => true,
                        ],
                        "element" => [
                            "type" => "timepicker",
                            "placeholder" => [
                                "type" => "plain_text",
                                "text" => "Select time",
                                "emoji" => true,
                            ],
                            "action_id" => "from_time",
                        ],
                    ],
                    [
                        "type" => "input",
                        "label" => [
                            "type" => "plain_text",
                            "text" => "To Time   ",
                            "emoji" => true,
                        ],
                        "element" => [
                            "type" => "timepicker",
                            "placeholder" => [
                                "type" => "plain_text",
                                "text" => "Select time",
                                "emoji" => true,
                            ],
                            "action_id" => "to_time",
                        ],
                    ],
                ],
                "callback_id" => "leave_request_submission",
            ];
            
            $data = [
                'trigger_id' => $trigger_id,
                'view' => $modalData,
            ];
            
            $jsonData = json_encode($data);
            
            $ch = curl_init('https://slack.com/api/views.open');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Authorization: Bearer ' .get_settings('slack_token')
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
        
            if ($httpCode != 200) {
                // Handle error; response was not successful
                echo json_encode(['error' => 'Failed to open modal']);
            } else {
                // Modal successfully opened
                exit();
            }
            
        } else {
            echo json_encode(['error' => 'Invalid request method']);
        }
    }
    
    
    
    
    public function submit_leave_application(){
        if ($_SERVER['REQUEST_METHOD'] == 'POST') {
            // Check if payload is set in $_REQUEST
            if (isset($_REQUEST['payload'])) {
                // Decode the URL-encoded JSON payload
                $payload = json_decode(urldecode($_REQUEST['payload']), true);
                
                // Check if decoding was successful
                if ($payload !== null) {
                    
                    
                    foreach ($payload['view']['state']['values']['absence_type_block'] as $key => $value) {
                        $absence_type = $value['selected_option']['value'];
                        break; // Assuming there's only one key in absence_type_block
                    }
                    
                    foreach ($payload['view']['state']['values']['absence_details_block'] as $key => $value) {
                        $absence_details = $value['value'];
                        break; 
                    }
                    
                    foreach ($payload['view']['state']['values'] as $key => $value) {
                        if (isset($value['from_date'])) {
                            $from_date = $value['from_date']['selected_date'];
                            break;
                        }
                    }
                    
                    foreach ($payload['view']['state']['values'] as $key => $value) {
                        if (isset($value['to_date'])) {
                            $to_date = $value['to_date']['selected_date'];
                            break;
                        }
                    }
                    
                    foreach ($payload['view']['state']['values'] as $key => $value) {
                        if (isset($value['from_time'])) {
                            $from_time = $value['from_time']['selected_time'];
                            break;
                        }
                    }
                    
                    foreach ($payload['view']['state']['values'] as $key => $value) {
                        if (isset($value['to_time'])) {
                            $to_time = $value['to_time']['selected_time'];
                            break;
                        }
                    }
                    
                    $slack_user_id = $payload['user']['id'];
                    $user_info_url = "https://slack.com/api/users.info?user={$slack_user_id}";
                    $ch = curl_init($user_info_url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        "Authorization:  Bearer " .get_settings('slack_token')
                    ]);
                    $response = curl_exec($ch);
                    curl_close($ch);
                    $user_info = json_decode($response, true);
                    if ($user_info['ok']) {
                        $user_email = $user_info['user']['profile']['email'];
                    } else {
                        $user_email = null;
                    }

                    $user_id = $this->users_model->get(['email' => $user_email])->getRow()->id;
                    if($user_id > 0){
                        // Section for storing these data into database
                        $data['user_id'] = $user_id;
                        $data['start_date'] = $from_date;
                        $data['end_date'] = $to_date;
                        $data['start_time'] = $from_time;
                        $data['end_time'] = $to_time;
                        $data['leave_type_id'] = $absence_type;
                        $data['remarks'] = $absence_details;
                        $data['status'] = 'pending';
                        $data['request_date'] = date('Y-m-d H:i:s');
                        $data['created_by'] = $user_id;
                        $data['created_at'] = date('Y-m-d H:i:s');
                        
                        $leave_application_id = $this->leave_request_model->add($data);
                    }
                    
                    
                    if($user_email !== null){
                        
                        $name = $user_info['user']['real_name'];
                        $token   = get_settings('slack_token');
                        $channel = get_settings('slack_channel');
        
        
                        $message = "$name's leave application has been submitted successfully!";      // Replace with your message
                        
                        
                        $url = 'https://slack.com/api/chat.postEphemeral';
                        $datas = array(
                            'token' => $token,
                            'channel' => $channel,
                            'user' => $slack_user_id,
                            'text' => $message
                        );
                        
                        $ch1 = curl_init();
                        curl_setopt($ch1, CURLOPT_URL, $url);
                        curl_setopt($ch1, CURLOPT_POST, true);
                        curl_setopt($ch1, CURLOPT_POSTFIELDS, http_build_query($datas));
                        curl_setopt($ch1, CURLOPT_RETURNTRANSFER, true);
                        
                        $response1 = curl_exec($ch1);
                        curl_close($ch1);
                        
                                                                                       
                    }else{
                        
                        http_response_code(400);
                        echo "Invalid JSON payload";
                        
                    }
                    
                } else {
                    // Handle JSON decoding error
                    http_response_code(400);
                    echo "Invalid JSON payload";
                }
            } else {
                // Handle missing payload in $_REQUEST
                http_response_code(400);
                echo "Payload missing in request";
            }
        }
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
}
