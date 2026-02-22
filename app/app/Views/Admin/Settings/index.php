<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            
            <form action="<?=base_url('app/settings/edit')?>" method="post">

            
                <div class="card-header">
                    <div class="row">
                        <div class="col-8">
                            <h5 class="card-title mb-0">General <?=$page_title ?? ''?></h5>
                        </div>
                    </div>
                </div>
                
                <div class="card-body">
                        <div class="row">
                            <div class="col-lg-12">
                                
                              
                                <div class="row">
                                    <div class="col-md-4 mb-3">
                                        <label for="start_time" class="form-label">Productivity Bar Duration in Minutes </label>
                                        <input type="text" class="form-control" value="<?=$slot['value']?>" name="productivity_bar_duration" required>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="start_time" class="form-label">Idle Time Duration in Minutes </label>
                                        <input type="text" class="form-control" value="<?=$idle['value']?>" name="idle_time_duration" required>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="start_time" class="form-label">ClientAgent checking in Minutes </label>
                                        <input type="text" class="form-control" value="<?=$nofication['value']?>" name="clientagent_notification_time" required>
                                    </div>
                                    
                                  
                                </div>
                                
                               
                                
                                
                                
                                
                               
                                
                                
                                
                            </div>
                        </div>
                    
                </div>
                
                <div class="card-header">
                    <div class="row">
                        <div class="col-8">
                            <h5 class="card-title mb-0">Slack <?=$page_title ?? ''?></h5>
                        </div>
                    </div>
                </div>
                
                <div class="card-body">
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="start_time" class="form-label">Slack Token </label>
                                        <input type="text" class="form-control" value="<?=$slack_token['value']?>" name="slack_token" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="start_time" class="form-label">Slack Channel </label>
                                        <input type="text" class="form-control" value="<?=$slack_channel['value']?>" name="slack_channel" required>
                                    </div>
                                    
                                    
                                </div>
                            </div>
                        </div>
                    
                </div>
                
                
                <div class="card-header">
                    <div class="row">
                        <div class="col-8">
                            <h5 class="card-title mb-0">Client Agent <?=$page_title ?? ''?></h5>
                        </div>
                    </div>
                </div>
                
                <div class="card-body">
                        <div class="row">
                            <div class="col-lg-12">
                                
                                
                                 <div class="row">
                                    
                                    
                                    <div class="col-md-12 mb-3">
                                        <label for="start_time" class="form-label">Google Client Agent JSON</label>
                                        <textarea class="form-control" name="google_auth_client_agent" required rows="4"><?=$gcagent['value']?></textarea>
                                    </div>
                                    <?php
                                    
                                    ?>
                                    
                                    <div class="col-md-12 mb-3">
                                        <!--<textarea class="form-control" name="google_auth_client_agent" required rows="4"><?//=json_decode($gcagent['value'],true)?></textarea>-->
                                    </div>
                                    
                                  
                                </div>
                                
                                
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="start_time" class="form-label">Google Client Agent Client ID </label>
                                        <input type="text" class="form-control" value="<?=$gc_client_id['value']?>" name="google_clientagent_client_id" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="start_time" class="form-label">Google Client Agent Client Secret</label>
                                        <input type="text" class="form-control" value="<?=$gc_client_secret['value']?>" name="google_clientagent_client_secret" required>
                                    </div>
                                    
                                </div>
                                
                            
                            </div>
                        </div>
                    
                </div>
                
                
                <div class="card-header">
                    <div class="row">
                        <div class="col-8">
                            <h5 class="card-title mb-0">Google Login <?=$page_title ?? ''?></h5>
                        </div>
                    </div>
                </div>
                
                <div class="card-body">
                        <div class="row">
                            <div class="col-lg-12">
                                
                              
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="start_time" class="form-label">Google Client ID </label>
                                        <input type="text" class="form-control" value="<?=$gcid['value']?>" name="google_client_id" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="start_time" class="form-label">Google Client Secret</label>
                                        <input type="text" class="form-control" value="<?=$gcsecret['value']?>" name="google_client_secret" required>
                                    </div>
                                    
                                </div>
                                
                                <div class="hstack gap-2 justify-content-end">
                                    <button class="btn btn-success float-end" type="submit">
                                        <i class="ri-check-fill"></i>
                                        Save
                                    </button>
                                </div>    
                                
                                
                            </div>
                        </div>
                    
                </div>
                
                
                
            </form>
        </div>
    </div>
</div><!--end row-->




