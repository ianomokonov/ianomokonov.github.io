<?php

if(isset($_GET['key'])){
    switch ($_GET['key']) {
        case 'sign-in':
            $data = json_decode(file_get_contents("php://input"));
            echo json_encode(signIn($data));
            return;
        case 'data-save':
            if ($decodeToken = checkToken($_GET['login'], $_GET['password'])) {
                $data = file_get_contents("php://input");
                echo json_encode(dataSave($data));
                return;
            }
            else{
                echo json_encode(array("isAccess" => false, "message" => "Нет прав доступа"));
                return;
            }
        default:
            echo json_encode(array("message" => "Ключ запроса не найден"));
            return;
    }
}

function signIn($user){
    if (!$user->login) {
        return array("isAccess" => false, "message" => "Введите логин", "method" => "signIn");
    }
    $data = file('./admin-data.php');
    $login = trim($data[1]);
    $password = trim($data[3]);
    if($user->login == $login){
        if(!password_verify($user->password, $password)){
            return array("isAccess" => false, "message" => "Неверный пароль", "method" => "signIn");
        }
        return array("isAccess" => true, "password" => $password);
    }
    return array("isAccess" => false, "message" => "Неверный логин", "method" => "signIn");
}

function dataSave($data){
    if ($data) {
        file_put_contents('./../data.json', $data);
        return array("isAccess" => true, "message" => "Данные обновлены", "method" => "dataSave");
    }
    else {
        return array("isAccess" => false, "message" => "Ошибка загрузки данных", "method" => "dataSave", "requestData" => $data);
    }
}

function checkToken($l, $p) {
    try{
        $data = file('./admin-data.php');
        $login = trim($data[1]);
        $password = trim($data[3]);
        if ($l == $login && $p == $password) {
            return true;
        }
        return false;
        
    } catch(Exception $e) {
        return false;
    }
}

?>