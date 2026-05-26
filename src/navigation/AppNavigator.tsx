import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { PreMain } from '@/screens/main/PreMain';
import { FormMenu } from '@/screens/form/FormMenu';
import { CanvasForm } from '@/screens/form/CanvasForm';
import { Effectiveness } from '@/screens/form/Effectiveness';
import { Actions } from '@/screens/form/Actions';
import { ListPending } from '@/screens/form/ListPending';
import { Formats } from '@/screens/form/Formats';
import { Records } from '@/screens/form/Records';
import { ListPamolsa } from '@/screens/form/ListPamolsa';
import { ActionDetail } from '@/screens/form/ActionDetail';
import { CreateEffectiveness } from '@/screens/form/CreateEffectiveness';
import { PamolsaActionForm } from '@/screens/form/pamolsa/PamolsaActionForm';
import { PamolsaActionFormDetail } from '@/screens/form/pamolsa/PamolsaActionFormDetail';
import { MedicalMenu } from '@/screens/medical/MedicalMenu';
import { FormRest } from '@/screens/medical/FormRest';
import { ListRest } from '@/screens/medical/ListRest';
import { LearningMenu } from '@/screens/learning/LearningMenu';
import { Courses } from '@/screens/learning/Courses';
import { Achievement } from '@/screens/learning/Achievement';
import { Exam } from '@/screens/learning/Exam';
import { CourseDetail } from '@/screens/learning/CourseDetail';
import { Lesson } from '@/screens/learning/Lesson';
import { PreExam } from '@/screens/learning/PreExam';
import { Survey } from '@/screens/learning/Survey';
import { TrainingMenu } from '@/screens/training/TrainingMenu';
import { TrainingMatrix } from '@/screens/training/TrainingMatrix';
import { COLORS } from '@/theme/colors';

export type RootStackParamList = {
  Auth: undefined;
  PreMain: undefined;
  FormMenu: undefined;
  /** Nuevo registro o vista (sin borrador local). Opcional `formRecordId` cuando exista API de detalle. */
  CanvasForm: { formId?: number; formRecordId?: number };
  /** Edición de borrador local (paridad `canvas-form-edit`). */
  CanvasFormEdit: { formId: number; index: number };
  Effectiveness: undefined;
  Actions: undefined;
  ListPending: undefined;
  Formats: undefined;
  PamolsaActionForm: { actionHeaderId?: number; initialSlideIndex?: number } | undefined;
  PamolsaActionFormDetail: { actionId: number };
  Records: undefined;
  ListPamolsa: { active_action?: number } | undefined;
  ActionDetail: { actionId: number };
  CreateEffectiveness: {
    pamolsaActionDetailId: number;
    effectiveDate: string;
  };
  MedicalMenu: undefined;
  FormRest: undefined;
  ListRest: undefined;
  LearningMenu: undefined;
  TrainingMenu: undefined;
  TrainingMatrix: { trainingId: string };
  Courses: undefined;
  CourseDetail: { courseId: number; name: string };
  Lesson: { courseId: number; name: string; lessonId: number };
  PreExam: { courseId: number; name: string; examId: number };
  Achievement: undefined;
  Exam: { courseId: number; name: string; examId: number };
  Survey: { courseId: number; name: string };
};

const Root = createStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Root.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}>
          <Root.Screen name="Auth" component={AuthNavigator} />
          <Root.Screen name="PreMain" component={PreMain} />
          <Root.Screen name="FormMenu" component={FormMenu} />
          <Root.Screen name="CanvasForm" component={CanvasForm} />
          <Root.Screen name="CanvasFormEdit" component={CanvasForm} />
          <Root.Screen name="ActionDetail" component={ActionDetail} />
          <Root.Screen
            name="CreateEffectiveness"
            component={CreateEffectiveness}
            options={{ headerShown: false }}
          />
          <Root.Screen
            name="Effectiveness"
            component={Effectiveness}
            options={{ headerShown: false }}
          />
          <Root.Screen name="Actions" component={Actions} />
          <Root.Screen name="ListPending" component={ListPending} />
          <Root.Screen name="Formats" component={Formats} />
          <Root.Screen name="PamolsaActionForm" component={PamolsaActionForm} />
          <Root.Screen name="PamolsaActionFormDetail" component={PamolsaActionFormDetail} />
          <Root.Screen
            name="Records"
            component={Records}
            options={{ headerShown: false }}
          />
          <Root.Screen
            name="ListPamolsa"
            component={ListPamolsa}
            options={{ headerShown: false }}
          />
          <Root.Screen name="MedicalMenu" component={MedicalMenu} />
          <Root.Screen
            name="FormRest"
            component={FormRest}
            options={{ headerShown: false }}
          />
          <Root.Screen
            name="ListRest"
            component={ListRest}
            options={{ headerShown: false }}
          />
          <Root.Screen name="LearningMenu" component={LearningMenu} />
          <Root.Screen name="TrainingMenu" component={TrainingMenu} />
          <Root.Screen name="TrainingMatrix" component={TrainingMatrix} />
          <Root.Screen name="Courses" component={Courses} />
          <Root.Screen name="CourseDetail" component={CourseDetail} />
          <Root.Screen name="Lesson" component={Lesson} />
          <Root.Screen name="PreExam" component={PreExam} />
          <Root.Screen name="Achievement" component={Achievement} />
          <Root.Screen name="Exam" component={Exam} />
          <Root.Screen name="Survey" component={Survey} />
        </Root.Navigator>
    </NavigationContainer>
  );
}
